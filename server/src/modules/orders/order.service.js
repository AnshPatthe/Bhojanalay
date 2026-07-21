import mongoose from 'mongoose';
import OrderRepository from './order.repository.js';
import OrderItem from '../../models/OrderItem.js';
import Payment from '../../models/Payment.js';
import Customer from '../../models/Customer.js';
import Inventory from '../../models/Inventory.js';
import Table from '../../models/Table.js';
import Bill from '../../models/Bill.js';
import { getIO } from '../../socket/socketServer.js';
import AppError from '../../utils/AppError.js';

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

    // Check if there is an active dine-in order for this table
    let existingOrder = null;
    if (orderType === 'dine-in' && tableNumber) {
      existingOrder = await OrderRepository.findOne({
        branchId,
        tableNumber,
        status: { $in: ['pending', 'preparing', 'ready'] }
      });
    }

    if (existingOrder) {
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

          let itemSubtotal = pendingItem.price * pendingItem.quantity;
          const modifierCost = (pendingItem.modifiers || []).reduce((acc, mod) => acc + mod.price, 0);
          itemSubtotal += modifierCost * pendingItem.quantity;
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

          let itemSubtotal = item.price * quantityToAdd;
          const modifierCost = (item.modifiers || []).reduce((acc, mod) => acc + mod.price, 0);
          itemSubtotal += modifierCost * quantityToAdd;

          await OrderItem.create({
            orderId: existingOrder._id,
            menuItemId: item.menuItemId,
            name: item.name,
            quantity: quantityToAdd,
            price: item.price,
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
      let itemSubtotal = item.price * item.quantity;
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
        price: item.price,
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

  async updateOrderStatus(orderId, status) {
    const validStatuses = ['pending', 'preparing', 'ready', 'billing', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new AppError('Invalid order status.', 400);
    }

    const order = await OrderRepository.update(orderId, { status });
    if (!order) {
      throw new AppError('Order not found.', 404);
    }

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
    }

    // Broadcast update
    try {
      const io = getIO();
      io.to(order.branchId.toString()).emit('order_status_updated', {
        orderId: order._id,
        status,
        order
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
}

export default new OrderService();
