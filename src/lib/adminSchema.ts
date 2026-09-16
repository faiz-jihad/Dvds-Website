export type AdminSchemaScope = 'dashboard' | 'homepage' | 'products' | 'taxonomy' | 'inventory' | 'orders' | 'promotions' | 'support' | 'users' | 'settings' | 'activity' | 'all';

const checks = {
  profiles: 'id,email,full_name,phone,role,avatar_url,created_at',
  products: 'id,sku,title,price,stock_quantity,status,imdb_rating,imdb_id',
  categories: 'id,name,slug,is_active,sort_order',
  genres: 'id,name,slug',
  product_genres: 'product_id,genre_id',
  orders: 'id,payment_method,payment_provider,paid_at,payment_confirmed_by,bank_transfer_reference,paypal_order_id,paypal_capture_id,checkout_session_id,delivery_name,bank_details,payment_review_required,refunded_amount',
  order_items: 'id,order_id,product_id,quantity,unit_price,total_price',
  payment_events: 'id,order_id,provider,event_type,amount',
  promotions: 'id,code,type,value,minimum_order,is_active',
  store_settings: 'id,singleton,registered_company_name,company_number,registered_office_address,companies_house_url,bank_name,bank_account_name,bank_sort_code,bank_account_number,bank_iban,bank_payment_instructions,payment_card_enabled,payment_paypal_enabled,payment_bank_transfer_enabled',
  inventory_movements: 'id,product_id,quantity_delta,created_at',
  order_status_history: 'id,order_id,new_status,created_at',
  admin_audit_log: 'id,table_name,record_id,action,created_at',
  contact_messages: 'id,name,email,message,status,assigned_to,internal_note',
  homepage_config: 'id,config_data',
} as const;

type Table = keyof typeof checks;
const dependencies: Record<Exclude<AdminSchemaScope, 'all'>, readonly Table[]> = {
  dashboard: ['orders', 'order_items', 'products', 'categories', 'genres', 'product_genres', 'store_settings'],
  homepage: ['homepage_config', 'products', 'categories', 'genres', 'product_genres'],
  products: ['products', 'categories', 'genres', 'product_genres'],
  taxonomy: ['categories', 'genres'],
  inventory: ['products', 'categories', 'genres', 'product_genres', 'inventory_movements', 'store_settings'],
  orders: ['orders', 'order_items'],
  promotions: ['promotions'],
  support: ['contact_messages', 'profiles'],
  users: ['profiles'],
  settings: ['store_settings', 'products', 'categories', 'genres', 'product_genres'],
  activity: ['inventory_movements', 'order_status_history', 'admin_audit_log', 'products', 'orders'],
};

export function adminSchemaScope(pathname: string): AdminSchemaScope {
  const section = pathname.split('/').filter(Boolean)[1];
  return section && Object.prototype.hasOwnProperty.call(dependencies, section)
    ? section as AdminSchemaScope : 'dashboard';
}

export function adminSchemaChecks(scope: AdminSchemaScope) {
  const tables = scope === 'all' ? Object.keys(checks) as Table[] : dependencies[scope];
  return tables.map((table) => ({ table, columns: checks[table] }));
}
