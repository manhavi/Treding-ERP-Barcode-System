export interface Permissions {
  purchase: boolean;
  inventory: boolean;
  dispatch: boolean;
  billing: boolean;
  parties: boolean;
  staff: boolean;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role?: 'admin' | 'staff';
  company?: 'aaradhya_fashion' | 'af_creation' | null;
  hasBothCompanies?: boolean;
  permissions?: Permissions;
}

export interface Product {
  id: number;
  design_number: string;
  /** API returns color_description; app may map to color for display */
  color?: string;
  color_description?: string;
  selling_price: number;
  barcode: string;
  stock_quantity: number;
  created_at: string;
}

export interface Purchase {
  id: number;
  design_number: string;
  color: string;
  selling_price: number;
  quantity: number;
  barcode: string;
  created_at: string;
}

export interface Party {
  id: number;
  name: string;
  address: string;
  phone: string;
  alternate_phone?: string;
  gstin?: string;
  place_of_supply?: string;
  transport?: string;
  station?: string;
  agent?: string;
  created_at: string;
}

export interface Dispatch {
  id: number;
  party_name: string;
  party_id: number;
  dispatch_date: string;
  products: DispatchProduct[];
  created_at: string;
}

export interface DispatchProduct {
  id: number;
  product_id: number;
  barcode: string;
  design_number: string;
  color: string;
  selling_price: number;
}

export interface DispatchItem {
  barcode: string;
  product: Product;
  quantity: number;
}

export interface Bill {
  id: number;
  dispatch_id: number;
  bill_type: 'aaradhya_fashion' | 'af_creation';
  party_name: string;
  subtotal: number;
  gst_amount: number;
  total_amount: number;
  bill_date: string;
  invoice_number: number | null;
  created_by: number | null;
}

export interface Staff {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'staff';
  is_active: boolean;
  permissions: Permissions;
  aaradhya_pin?: string;
  af_creation_pin?: string;
}
