export const SOCKET_EVENTS = {
  ORDER_CREATED: 'order_created',
  ORDER_ITEMS_ADDED: 'order_items_added',
  ORDER_ITEM_PREPARING: 'order_item_preparing',
  ORDER_ITEM_READY: 'order_item_ready',
  ORDER_UPDATED: 'order_status_updated',
  TABLE_OCCUPIED: 'table_occupied',
  TABLE_CLOSED: 'table_closed',
  TABLE_BILLING: 'table_billing',
  TABLE_AVAILABLE: 'table_status_updated',
  BILL_CREATED: 'bill_created',
  BILL_PAID: 'bill_paid',
  JOIN_BRANCH: 'join_branch',
  TABLES_UPDATED: 'tables_updated'
};

export default SOCKET_EVENTS;
