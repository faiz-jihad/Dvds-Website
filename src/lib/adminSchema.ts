export type AdminSchemaScope = 'dashboard' | 'homepage' | 'products' | 'taxonomy' | 'inventory' | 'orders' | 'promotions' | 'support' | 'users' | 'settings' | 'activity' | 'all';

const checks = {
  profiles: 'id,email,full_name,role,created_at',
  products: 'id,sku,title,price,stock_quantity,status',
  categories: 'id,name,slug',
  genres: 'id,name,slug',
  product_genres: 'product_id,genre_id',
  orders: 'id,total_amount,status,payment_status,payment_method,created_at',
  order_items: 'id,order_id,product_id,quantity,unit_price,total_price',
  payment_events: 'id,order_id,provider,event_type,amount',
  promotions: 'id,code,type,value',
  store_settings: 'id,singleton,registered_company_name,bank_name,payment_card_enabled',
  inventory_movements: 'id,product_id,quantity_delta,created_at',
  order_status_history: 'id,order_id,new_status,created_at',
  admin_audit_log: 'id,table_name,record_id,action,created_at',
  contact_messages: 'id,name,email,message,status',
  homepage_config: 'id,config_data',
  media_assets: 'id,asset_data,created_at',
} as const;

type Table = keyof typeof checks;
const dependencies: Record<Exclude<AdminSchemaScope, 'all'>, readonly Table[]> = {
  dashboard: ['orders', 'order_items', 'products', 'categories', 'genres', 'product_genres', 'store_settings'],
  homepage: ['homepage_config', 'media_assets', 'products', 'categories', 'genres', 'product_genres'],
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
