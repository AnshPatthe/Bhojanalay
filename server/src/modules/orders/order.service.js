import mongoose from 'mongoose';
import OrderRepository from './order.repository.js';
import OrderItem from '../../models/OrderItem.js';
import Payment from '../../models/Payment.js';
import Customer from '../../models/Customer.js';
import Inventory from '../../models/Inventory.js';
import Table from '../../models/Table.js';
import Bill from '../../models/Bill.js';
import Order from '../../models/Order.js';
import { getIO } from '../../socket/socketServer.js';
import AppError from '../../utils/AppError.js';

const getMenuItemPrice = (menuItem) => {
  if (!menuItem.happyHourPrice || !menuItem.happyHourStart || !menuItem.happyHourEnd) {
    return menuItem.price;
  }
  
  const now = new Date();
  const day = now.getDay(); // 0-6
  
  // Check if today is one of the happy hour days
  if (menuItem.happyHourDays && menuItem.happyHourDays.length > 0 && !menuItem.happyHourDays.includes(day)) {
    return menuItem.price;
  }
  
  // Check if current time is within happy hour range (HH:mm)
  const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  if (currentHourMin >= menuItem.happyHourStart && currentHourMin <= menuItem.happyHourEnd) {
    return menuItem.happyHourPrice;
  }
  
  return menuItem.price;
};

class OrderService {
  async createOrder(restaurantId, branchId, employeeId, orderData) {
    const { tableNumber, orderType, items, customerPhone, customerName, notes } = orderData;

    if (!items || items.length === 0) {
      throw new AppError('An order must contain at least one item.', 400);
    }

    let orderTableId = orderData.tableId || null;
    if (!orderTableId && orderType === 'dine-in' && tableNumber) {
      const tableDoc = await Table.findOne({ branchId, tableNumber });
      if (tableDoc) {
        orderTableId = tableDoc._id;
      }
    }

    // Verify if table is currently locked in Billing state
    if (orderType === 'dine-in') {
      const tableDoc = orderTableId 
        ? await Table.findById(orderTableId) 
        : (tableNumber ? await Table.findOne({ branchId, tableNumber }) : null);
      if (tableDoc && tableDoc.status === 'Billing') {
        throw new AppError('This table is locked for billing. Complete payment before taking new orders.', 400);
      }
    }

    // Fetch all related MenuItems to apply Happy Hour pricing
    const MenuItem = mongoose.model('MenuItem');
    const menuItemIds = items.map(i => i.menuItemId);
    const dbMenuItems = await MenuItem.find({ _id: { $in: menuItemIds } });

    // Check if there is an active dine-in order for this table
    let existingOrder = null;
    if (orderType === 'dine-in' && tableNumber) {
      existingOrder = await OrderRepository.findOne({
        branchId,
        tableNumber,
        status: { $in: ['pending', 'preparing', 'ready', 'billing'] }
      });
    }

    if (existingOrder) {
      // Waiter Lock Check
      if (['billing', 'completed', 'cancelled'].includes(existingOrder.status)) {
        let isAdminOverride = false;
        if (employeeId) {
          const EmployeeModel = mongoose.model('Employee');
          const employee = await EmployeeModel.findById(employeeId).populate('roleId');
          if (employee && employee.roleId && ['Owner', 'Manager'].includes(employee.roleId.name)) {
            isAdminOverride = true;
          }
        }
        if (!isAdminOverride) {
          throw new AppError('This order is locked (billing/completed/cancelled). Modifications are locked without Admin override.', 400);
        }
      }

      console.log('[OrderService] existingOrder found:', existingOrder._id);
      const existingItems = await OrderItem.find({ orderId: existingOrder._id });
      console.log('[OrderService] DB existingItems:', existingItems.map(i => ({ name: i.name, qty: i.quantity, status: i.status })));

      // Delete pending items that are no longer in the cart
      const sentMenuItemIds = items.map(item => item.menuItemId.toString());
      const pendingItemsToDelete = existingItems.filter(
        dbItem => dbItem.status === 'pending' && !sentMenuItemIds.includes(dbItem.menuItemId.toString())
      );
      for (const dbItem of pendingItemsToDelete) {
        await OrderItem.deleteOne({ _id: dbItem._id });
      }
      const existingItemsFiltered = existingItems.filter(
        dbItem => !pendingItemsToDelete.some(deleted => deleted._id.toString() === dbItem._id.toString())
      );

      for (const item of items) {
        const dbItem = dbMenuItems.find(db => db._id.toString() === item.menuItemId.toString());
        const basePrice = dbItem ? getMenuItemPrice(dbItem) : item.price;

        // Look for an existing item that is still 'pending'
        const pendingItem = existingItemsFiltered.find(
          i => i.menuItemId.toString() === item.menuItemId.toString() && i.status === 'pending'
        );

        if (pendingItem) {
          if (item.isExisting) {
            pendingItem.quantity = item.quantity;
          } else {
            pendingItem.quantity += item.quantity;
          }

          let itemSubtotal = basePrice * pendingItem.quantity;
          const modifierCost = (pendingItem.modifiers || []).reduce((acc, mod) => acc + mod.price, 0);
          itemSubtotal += modifierCost * pendingItem.quantity;
          pendingItem.price = basePrice;
          pendingItem.subtotal = itemSubtotal;
          pendingItem.notes = item.notes || pendingItem.notes;
          await pendingItem.save();
        } else {
          // If no pending item exists, check if this is an existing item already in other statuses (e.g. ready/served)
          let quantityToAdd = item.quantity;
          if (item.isExisting) {
            const dbItemsOfSameId = existingItemsFiltered.filter(
              i => i.menuItemId.toString() === item.menuItemId.toString()
            );
            const totalDbQty = dbItemsOfSameId.reduce((sum, i) => sum + i.quantity, 0);
            
            if (item.quantity <= totalDbQty) {
              // Item is already in database and not increased in quantity, skip it to prevent duplication
              continue;
            }
            quantityToAdd = item.quantity - totalDbQty;
          }

          let itemSubtotal = basePrice * quantityToAdd;
          const modifierCost = (item.modifiers || []).reduce((acc, mod) => acc + mod.price, 0);
          itemSubtotal += modifierCost * quantityToAdd;

          await OrderItem.create({
            orderId: existingOrder._id,
            menuItemId: item.menuItemId,
            name: item.name,
            quantity: quantityToAdd,
            price: basePrice,
            subtotal: itemSubtotal,
            modifiers: item.modifiers || [],
            notes: item.notes || '',
            status: 'pending'
          });
        }
      }

      // Fetch fresh items state
      const allItems = await OrderItem.find({ orderId: existingOrder._id });

      // Recalculate subtotal and tax based on all active items
      let subtotal = 0;
      let totalTax = 0;
      for (const savedItem of allItems) {
        subtotal += savedItem.subtotal;
        const taxRate = savedItem.taxPercentage ? savedItem.taxPercentage / 100 : 0.08;
        totalTax += savedItem.subtotal * taxRate;
      }

      existingOrder.subtotal = subtotal;
      existingOrder.tax = totalTax;
      existingOrder.total = subtotal + totalTax;
      existingOrder.notes = notes || existingOrder.notes;
      if (orderData.waiterId) existingOrder.waiterId = orderData.waiterId;
      if (!existingOrder.tableId) existingOrder.tableId = orderTableId;

      // Recalculate overall order status based on active items
      const activeItems = allItems.filter(i => i.status !== 'cancelled');
      const allReady = activeItems.every(i => ['ready', 'served'].includes(i.status));
      const hasCookingOrPending = activeItems.some(i => ['pending', 'preparing'].includes(i.status));

      if (allReady && activeItems.length > 0) {
        if (!['ready', 'billing', 'completed', 'cancelled'].includes(existingOrder.status)) {
          existingOrder.status = 'ready';
          existingOrder.readyAt = Date.now();
        }
      } else if (hasCookingOrPending) {
        if (['ready'].includes(existingOrder.status)) {
          existingOrder.status = 'preparing';
        }
      }

      await existingOrder.save();

      // Check if bill exists and update it
      const existingBill = await Bill.findOne({ orderId: existingOrder._id });
      if (existingBill) {
        existingBill.items = allItems.map(item => ({
          menuItemId: item.menuItemId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal
        }));
        existingBill.subtotal = subtotal;
        existingBill.gstAmount = parseFloat(((subtotal * existingBill.gstPercentage) / 100).toFixed(2));
        existingBill.grandTotal = parseFloat((subtotal + existingBill.gstAmount).toFixed(2));
        await existingBill.save();
      }

      // Deduct inventory for newly added items
      try {
        for (const item of items) {
          const matchingExistingItems = existingItems.filter(i => i.menuItemId.toString() === item.menuItemId.toString());
          const previousTotalQuantity = matchingExistingItems.reduce((sum, i) => sum + i.quantity, 0);
          const diff = item.quantity - previousTotalQuantity;
          if (diff > 0) {
            const inventoryItem = await Inventory.findOne({ branchId, itemName: item.name });
            if (inventoryItem) {
              inventoryItem.quantity = Math.max(0, inventoryItem.quantity - diff);
              await inventoryItem.save();
            }
          }
        }
      } catch (invErr) {
        console.error('[OrderService] Inventory update failed during append', invErr.message);
      }

      // Broadcast update
      try {
        const io = getIO();
        const populatedOrder = {
          ...existingOrder.toObject(),
          items: allItems
        };
        io.to(branchId.toString()).emit('new_order', populatedOrder);
        io.to(branchId.toString()).emit('order_status_updated', {
          orderId: existingOrder._id,
          status: existingOrder.status,
          order: populatedOrder
        });
      } catch (socketErr) {
        console.error('[Socket] Failed to broadcast updated order', socketErr.message);
      }

      return {
        order: existingOrder,
        items: allItems
      };
    }

    // 1. Manage Customer details (if phone supplied)
    let customerId = null;
    if (customerPhone) {
      let customer = await Customer.findOne({ restaurantId, phone: customerPhone });
      if (!customer) {
        customer = await Customer.create({
          restaurantId,
          phone: customerPhone,
          name: customerName || 'Valued Guest'
        });
      }
      customerId = customer._id;
    }

    // 2. Compute financial totals
    let subtotal = 0;
    let totalTax = 0;

    const itemsToCreate = items.map(item => {
      const dbItem = dbMenuItems.find(db => db._id.toString() === item.menuItemId.toString());
      const basePrice = dbItem ? getMenuItemPrice(dbItem) : item.price;

      let itemSubtotal = basePrice * item.quantity;
      // Modifiers subtotal addition
      const modifierCost = (item.modifiers || []).reduce((acc, mod) => acc + mod.price, 0);
      itemSubtotal += modifierCost * item.quantity;

      subtotal += itemSubtotal;
      
      const taxRate = item.taxPercentage ? item.taxPercentage / 100 : 0.08;
      const itemTax = itemSubtotal * taxRate;
      totalTax += itemTax;

      return {
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        price: basePrice,
        subtotal: itemSubtotal,
        modifiers: item.modifiers || [],
        notes: item.notes || ''
      };
    });

    const total = subtotal + totalTax;

    // 3. Save Order Root Document
    const order = await OrderRepository.create({
      restaurantId,
      branchId,
      employeeId,
      tableNumber,
      orderType,
      subtotal,
      tax: totalTax,
      total,
      customerId,
      notes,
      waiterId: orderData.waiterId || null,
      tableId: orderTableId
    });

    // 4. Save Order Items
    const itemsWithOrderId = itemsToCreate.map(item => ({ ...item, orderId: order._id }));
    const savedItems = await OrderItem.insertMany(itemsWithOrderId);

    // 4.5 Deduct Inventory & Occupy Table
    try {
      if (orderType === 'dine-in' && tableNumber) {
        await Table.findOneAndUpdate(
          { branchId, tableNumber },
          { status: 'Occupied' }
        );
      }

      for (const item of itemsToCreate) {
        const inventoryItem = await Inventory.findOne({ branchId, itemName: item.name });
        if (inventoryItem) {
          inventoryItem.quantity = Math.max(0, inventoryItem.quantity - item.quantity);
          await inventoryItem.save();
        }
      }
    } catch (inventoryTableErr) {
      console.error('[OrderService] Failed to update inventory or table status', inventoryTableErr.message);
    }

    // 5. Broadcast new order to branch sockets
    try {
      const io = getIO();
      const populatedOrder = {
        ...order.toObject(),
        items: savedItems
      };
      io.to(branchId.toString()).emit('new_order', populatedOrder);
      io.to(branchId.toString()).emit('tables_updated');
    } catch (socketErr) {
      // Log socket failures without breaking order transaction
      console.error('[Socket] Failed to broadcast new order event', socketErr.message);
    }

    return {
      order,
      items: savedItems
    };
  }

  async getOrders(branchId, filter = {}) {
    const query = { branchId };
    if (filter.status) query.status = filter.status;
    if (filter.paymentStatus) query.paymentStatus = filter.paymentStatus;

    // Find and populate order items, customer details, and employees
    const orders = await OrderRepository.find(query, '', '', { createdAt: -1 });

    const populatedOrders = await Promise.all(
      orders.map(async (order) => {
        const items = await OrderItem.find({ orderId: order._id });
        return {
          ...order.toObject(),
          items
        };
      })
    );

    return populatedOrders;
  }

  async updateOrderStatus(orderId, status, employeeId = null) {
    const validStatuses = ['pending', 'preparing', 'ready', 'billing', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new AppError('Invalid order status.', 400);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw new AppError('Order not found.', 404);
    }

    // Role check for waiter lock
    let isAdminOverride = false;
    if (employeeId) {
      const EmployeeModel = mongoose.model('Employee');
      const employee = await EmployeeModel.findById(employeeId).populate('roleId');
      if (employee && employee.roleId && ['Owner', 'Manager'].includes(employee.roleId.name)) {
        isAdminOverride = true;
      }
    }

    // If order status is preparing/ready, lock waiter changes
    if (['preparing', 'ready'].includes(order.status) && !isAdminOverride) {
      throw new AppError('This order is currently preparing or ready in the kitchen. Status transitions are locked without Admin override.', 400);
    }

    order.status = status;
    if (status === 'preparing') {
      order.preparingAt = Date.now();
      // Set all pending items to preparing
      await OrderItem.updateMany(
        { orderId: order._id, status: 'pending' },
        { status: 'preparing', preparingAt: Date.now() }
      );
    } else if (status === 'ready') {
      order.readyAt = Date.now();
      // Set all preparing/pending items to ready
      await OrderItem.updateMany(
        { orderId: order._id, status: { $in: ['pending', 'preparing'] } },
        { status: 'ready', readyAt: Date.now() }
      );
    }

    await order.save();

    if (status === 'completed' || status === 'cancelled') {
      try {
        if (order.orderType === 'dine-in' && order.tableNumber) {
          await Table.findOneAndUpdate(
            { branchId: order.branchId, tableNumber: order.tableNumber },
            { status: 'Available' }
          );
        }
      } catch (err) {
        console.error('[OrderService] Failed to release table', err.message);
      }
    } else if (status === 'preparing') {
      try {
        if (order.orderType === 'dine-in' && order.tableNumber) {
          await Table.findOneAndUpdate(
            { branchId: order.branchId, tableNumber: order.tableNumber },
            { status: 'Preparing' }
          );
        }
      } catch (err) {
        console.error('[OrderService] Failed to set table to Preparing', err.message);
      }
    } else if (status === 'ready') {
      try {
        if (order.orderType === 'dine-in' && order.tableNumber) {
          await Table.findOneAndUpdate(
            { branchId: order.branchId, tableNumber: order.tableNumber },
            { status: 'Occupied' }
          );
        }
      } catch (err) {
        console.error(err);
      }
    }

    // Refresh order items
    const items = await OrderItem.find({ orderId: order._id });

    // Broadcast update
    try {
      const io = getIO();
      io.to(order.branchId.toString()).emit('order_status_updated', {
        orderId: order._id,
        status,
        order: {
          ...order.toObject(),
          items
        }
      });
      io.to(order.branchId.toString()).emit('tables_updated');
    } catch (socketErr) {
      console.error('[Socket] Failed to broadcast status update', socketErr.message);
    }

    return order;
  }

  async processPayment(restaurantId, branchId, orderId, paymentData) {
    const { amount, paymentMethod } = paymentData;

    const order = await OrderRepository.findById(orderId);
    if (!order) {
      throw new AppError('Order not found.', 404);
    }

    const payment = await Payment.create({
      orderId,
      restaurantId,
      branchId,
      amount,
      paymentMethod,
      status: 'completed',
      transactionId: `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    });

    // Update order status
    order.paymentStatus = 'paid';
    order.status = 'completed'; // Completes the order upon payment
    await order.save();

    try {
      if (order.orderType === 'dine-in' && order.tableNumber) {
        await Table.findOneAndUpdate(
          { branchId: order.branchId, tableNumber: order.tableNumber },
          { status: 'Available' }
        );
      }
    } catch (err) {
      console.error('[OrderService] Failed to release table after payment', err.message);
    }

    // Broadcast update
    try {
      const io = getIO();
      io.to(branchId.toString()).emit('order_status_updated', {
        orderId: order._id,
        status: 'completed',
        paymentStatus: 'paid'
      });
      io.to(branchId.toString()).emit('tables_updated');
    } catch (socketErr) {
      console.error('[Socket] Failed to broadcast payment completion', socketErr.message);
    }

    return {
      order,
      payment
    };
  }

  async updateOrderItemStatus(itemId, status, employeeId = null) {
    const validStatuses = ['pending', 'preparing', 'ready', 'served', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new AppError('Invalid item status.', 400);
    }

    const item = await OrderItem.findById(itemId);
    if (!item) {
      throw new AppError('Order item not found.', 404);
    }

    const order = await Order.findById(item.orderId);
    if (!order) {
      throw new AppError('Order not found for this item.', 404);
    }

    let isAdminOverride = false;
    if (employeeId) {
      const EmployeeModel = mongoose.model('Employee');
      const employee = await EmployeeModel.findById(employeeId).populate('roleId');
      if (employee && employee.roleId && ['Owner', 'Manager'].includes(employee.roleId.name)) {
        isAdminOverride = true;
      }
    }

    if (['preparing', 'ready'].includes(item.status) && status === 'cancelled' && !isAdminOverride) {
      throw new AppError('This item is currently being prepared or is ready. Cancellations are locked without Admin override.', 400);
    }

    item.status = status;
    if (status === 'preparing') {
      item.preparingAt = Date.now();
      if (order.status === 'pending') {
        order.status = 'preparing';
        order.preparingAt = Date.now();
        await order.save();

        if (order.orderType === 'dine-in' && order.tableNumber) {
          await Table.findOneAndUpdate(
            { branchId: order.branchId, tableNumber: order.tableNumber },
            { status: 'Preparing' }
          );
        }
      }
    } else if (status === 'ready') {
      item.readyAt = Date.now();
    }
    
    await item.save();

    const items = await OrderItem.find({ orderId: order._id });
    const activeItems = items.filter(i => i.status !== 'cancelled');
    const allReady = activeItems.every(i => ['ready', 'served'].includes(i.status));
    
    if (allReady && activeItems.length > 0 && !['ready', 'billing', 'completed', 'cancelled'].includes(order.status)) {
      order.status = 'ready';
      order.readyAt = Date.now();
      await order.save();
    }

    order.items = items.map(i => ({
      menuItemId: i.menuItemId,
      name: i.name,
      quantity: i.quantity,
      price: i.price,
      subtotal: i.subtotal,
      modifiers: i.modifiers,
      notes: i.notes
    }));
    await order.save();

    try {
      const io = getIO();
      const populatedOrder = {
        ...order.toObject(),
        items
      };
      io.to(order.branchId.toString()).emit('order_status_updated', {
        orderId: order._id,
        status: order.status,
        order: populatedOrder
      });
      io.to(order.branchId.toString()).emit('tables_updated');
    } catch (socketErr) {
      console.error('[Socket] Failed to broadcast item status update', socketErr.message);
    }

    return item;
  }

  async cancelOrder(orderId, reason, employeeId = null) {
    if (!reason) {
      throw new AppError('Cancellation reason is required.', 400);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw new AppError('Order not found.', 404);
    }

    let isAdminOverride = false;
    if (employeeId) {
      const EmployeeModel = mongoose.model('Employee');
      const employee = await EmployeeModel.findById(employeeId).populate('roleId');
      if (employee && employee.roleId && ['Owner', 'Manager'].includes(employee.roleId.name)) {
        isAdminOverride = true;
      }
    }

    if (order.status !== 'pending' && !isAdminOverride) {
      throw new AppError('Only pending orders can be cancelled without Admin override.', 400);
    }

    order.status = 'cancelled';
    order.cancellationReason = reason;
    await order.save();

    await OrderItem.updateMany(
      { orderId: order._id },
      { status: 'cancelled', cancellationReason: reason }
    );

    if (order.orderType === 'dine-in' && order.tableNumber) {
      await Table.findOneAndUpdate(
        { branchId: order.branchId, tableNumber: order.tableNumber },
        { status: 'Available' }
      );
    }

    const items = await OrderItem.find({ orderId: order._id });

    try {
      const io = getIO();
      const populatedOrder = {
        ...order.toObject(),
        items
      };
      io.to(order.branchId.toString()).emit('order_status_updated', {
        orderId: order._id,
        status: 'cancelled',
        order: populatedOrder
      });
      io.to(order.branchId.toString()).emit('tables_updated');
    } catch (socketErr) {
      console.error('[Socket] Failed to broadcast order cancellation', socketErr.message);
    }

    return order;
  }

  async cancelOrderItem(orderId, itemId, reason, employeeId = null) {
    if (!reason) {
      throw new AppError('Cancellation reason is required.', 400);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw new AppError('Order not found.', 404);
    }

    const item = await OrderItem.findById(itemId);
    if (!item) {
      throw new AppError('Order item not found.', 404);
    }

    let isAdminOverride = false;
    if (employeeId) {
      const EmployeeModel = mongoose.model('Employee');
      const employee = await EmployeeModel.findById(employeeId).populate('roleId');
      if (employee && employee.roleId && ['Owner', 'Manager'].includes(employee.roleId.name)) {
        isAdminOverride = true;
      }
    }

    if (item.status !== 'pending' && !isAdminOverride) {
      throw new AppError('Only pending items can be cancelled, unless overridden by an Admin.', 400);
    }

    item.status = 'cancelled';
    item.cancellationReason = reason;
    await item.save();

    const items = await OrderItem.find({ orderId: order._id });
    const activeItems = items.filter(i => i.status !== 'cancelled');

    let subtotal = 0;
    let totalTax = 0;
    for (const savedItem of activeItems) {
      subtotal += savedItem.subtotal;
      const taxRate = savedItem.taxPercentage ? savedItem.taxPercentage / 100 : 0.08;
      totalTax += savedItem.subtotal * taxRate;
    }

    order.subtotal = subtotal;
    order.tax = totalTax;
    order.total = subtotal + totalTax;

    if (activeItems.length === 0) {
      order.status = 'cancelled';
      order.cancellationReason = `All items cancelled: ${reason}`;
      if (order.orderType === 'dine-in' && order.tableNumber) {
        await Table.findOneAndUpdate(
          { branchId: order.branchId, tableNumber: order.tableNumber },
          { status: 'Available' }
        );
      }
    } else {
      const allReady = activeItems.every(i => ['ready', 'served'].includes(i.status));
      if (allReady && !['ready', 'billing', 'completed', 'cancelled'].includes(order.status)) {
        order.status = 'ready';
        order.readyAt = Date.now();
      }
    }

    order.items = items.map(i => ({
      menuItemId: i.menuItemId,
      name: i.name,
      quantity: i.quantity,
      price: i.price,
      subtotal: i.subtotal,
      modifiers: i.modifiers,
      notes: i.notes
    }));
    await order.save();

    try {
      const io = getIO();
      const populatedOrder = {
        ...order.toObject(),
        items
      };
      io.to(order.branchId.toString()).emit('order_status_updated', {
        orderId: order._id,
        status: order.status,
        order: populatedOrder
      });
      io.to(order.branchId.toString()).emit('tables_updated');
    } catch (socketErr) {
      console.error('[Socket] Failed to broadcast item cancellation', socketErr.message);
    }

    return item;
  }

  async recallOrderToPreparing(orderId, employeeId = null) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new AppError('Order not found.', 404);
    }

    let isAllowed = false;
    if (employeeId) {
      const EmployeeModel = mongoose.model('Employee');
      const employee = await EmployeeModel.findById(employeeId).populate('roleId');
      if (employee && employee.roleId && ['Owner', 'Manager', 'Chef'].includes(employee.roleId.name)) {
        isAllowed = true;
      }
    }

    if (!isAllowed) {
      throw new AppError('Only Chefs or Admins can recall orders back to preparation.', 403);
    }

    order.status = 'preparing';
    order.readyAt = undefined;
    await order.save();

    await OrderItem.updateMany(
      { orderId: order._id, status: 'ready' },
      { status: 'preparing', readyAt: undefined }
    );

    if (order.orderType === 'dine-in' && order.tableNumber) {
      await Table.findOneAndUpdate(
        { branchId: order.branchId, tableNumber: order.tableNumber },
        { status: 'Preparing' }
      );
    }

    const items = await OrderItem.find({ orderId: order._id });

    try {
      const io = getIO();
      const populatedOrder = {
        ...order.toObject(),
        items
      };
      io.to(order.branchId.toString()).emit('order_status_updated', {
        orderId: order._id,
        status: 'preparing',
        order: populatedOrder
      });
      io.to(order.branchId.toString()).emit('tables_updated');
    } catch (socketErr) {
      console.error('[Socket] Failed to broadcast recall', socketErr.message);
    }

    return order;
  }

  async splitBill(orderId, splitCount) {
    const order = await Order.findById(orderId);
    if (!order) throw new AppError('Order not found.', 404);

    const items = await OrderItem.find({ orderId: order._id });
    if (items.length === 0) throw new AppError('Cannot split bill of empty order.', 400);

    let bill = await Bill.findOne({ orderId: order._id, paymentStatus: 'unpaid' });
    if (!bill) {
      throw new AppError('No generated bill found. Please generate the bill first before splitting.', 400);
    }

    const splitAmount = parseFloat((bill.grandTotal / splitCount).toFixed(2));
    const splits = Array.from({ length: splitCount }, (_, i) => ({
      splitIndex: i + 1,
      amount: splitAmount,
      status: 'unpaid'
    }));

    bill.splits = splits;
    bill.isSplit = true;
    await bill.save();

    return bill;
  }

  async mergeTables(branchId, tableNumbers) {
    if (!tableNumbers || tableNumbers.length < 2) {
      throw new AppError('At least 2 tables are required to merge.', 400);
    }

    const tablesList = await Table.find({ branchId, tableNumber: { $in: tableNumbers } });
    if (tablesList.length !== tableNumbers.length) {
      throw new AppError('Some tables were not found.', 404);
    }

    const targetTable = tablesList[0];
    const otherTables = tablesList.slice(1);

    for (const t of otherTables) {
      t.status = 'Occupied';
      t.notes = `Merged with ${targetTable.tableNumber}`;
      await t.save();
    }
    
    targetTable.notes = `Merged with ${otherTables.map(o => o.tableNumber).join(', ')}`;
    await targetTable.save();

    try {
      const io = getIO();
      io.to(branchId.toString()).emit('tables_updated');
    } catch (err) {
      console.error(err);
    }

    return { message: 'Tables merged successfully.', tables: tablesList };
  }

  async splitMergedTables(branchId, tableNumber) {
    const table = await Table.findOne({ branchId, tableNumber });
    if (!table) throw new AppError('Table not found.', 404);

    table.notes = '';
    table.status = 'Available';
    await table.save();

    try {
      const io = getIO();
      io.to(branchId.toString()).emit('tables_updated');
    } catch (err) {
      console.error(err);
    }

    return { message: 'Table split successfully.' };
  }

  async transferOrder(orderId, newWaiterId) {
    const order = await Order.findById(orderId);
    if (!order) throw new AppError('Order not found.', 404);

    const WaiterModel = mongoose.model('Waiter');
    const newWaiter = await WaiterModel.findById(newWaiterId);
    if (!newWaiter) throw new AppError('Target waiter not found.', 404);

    order.waiterId = newWaiterId;
    await order.save();

    await Bill.findOneAndUpdate({ orderId: order._id }, { waiterId: newWaiterId });

    try {
      const io = getIO();
      io.to(order.branchId.toString()).emit('order_status_updated', {
        orderId: order._id,
        status: order.status,
        order
      });
    } catch (err) {
      console.error(err);
    }

    return order;
  }
}

export default new OrderService();
