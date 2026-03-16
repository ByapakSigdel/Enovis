/* ------------------------------------------------------------------ */
/*  Shared frontend types – aligned with backend schema               */
/*  The API client (api.ts) converts snake_case ↔ camelCase           */
/*  so all fields here use camelCase.                                  */
/* ------------------------------------------------------------------ */

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  mode: "individual" | "enterprise";
  createdAt?: string;
}

export interface Task {
  id: string;
  userId?: string;
  title: string;
  description?: string | null;
  status: string;
  priority: "low" | "medium" | "high" | "urgent";
  dueDate?: string | null;
  dueTime?: string | null;
  category?: string | null;
  completed: boolean;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CalendarEvent {
  id: string;
  userId?: string;
  title: string;
  description?: string | null;
  startDatetime: string;
  endDatetime: string;
  allDay: boolean;
  category?: string | null;
  color?: string | null;
  location?: string | null;
  recurrence?: string | null;
  status?: string | null;
}

export interface Transaction {
  id: string;
  userId?: string;
  type: "expense" | "income" | "transfer";
  amount: number;
  currency: string;
  category: string;
  date: string;
  merchant?: string | null;
  description?: string | null;
  paymentMethod?: string | null;
  tags?: string[];
}

export interface Budget {
  id: string;
  userId?: string;
  category: string;
  amount: number;
  spent: number;
  period: string;
}

export interface Habit {
  id: string;
  userId?: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  frequency: string;
  trackingType: "checkbox" | "counter" | "duration" | "value";
  target: number;
  currentStreak: number;
  longestStreak: number;
  category?: string | null;
  archived?: boolean;
}

export interface HabitCompletion {
  habitId: string;
  userId?: string;
  date: string;
  completed: boolean;
  value?: number | null;
  note?: string | null;
}

export interface Goal {
  id: string;
  userId?: string;
  title: string;
  description?: string | null;
  category?: string | null;
  progress: number;
  milestones: Milestone[];
  targetDate: string;
  status: string;
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
}

export interface HealthMetric {
  id: string;
  userId?: string;
  type: string;
  value: number;
  date: string;
  unit: string;
  notes?: string | null;
}

export interface Note {
  id: string;
  userId?: string;
  title: string;
  content: string;
  notebook?: string | null;
  tags: string[];
  pinned: boolean;
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface JournalEntry {
  id: string;
  userId?: string;
  date: string;
  mood: number;
  prompt?: string | null;
  content: string;
  gratitude: string[];
}

export interface FocusSession {
  id: string;
  userId?: string;
  task?: string | null;
  duration: number;
  elapsed: number;
  status: "idle" | "running" | "paused" | "break" | "completed";
  startedAt?: string | null;
  endedAt?: string | null;
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}

/* ------------------------------------------------------------------ */
/*  Enterprise types                                                   */
/* ------------------------------------------------------------------ */

export interface Enterprise {
  id: string;
  name: string;
  slug: string;
  industry?: string | null;
  size?: string | null;
  ownerId: string;
  logo?: string | null;
  website?: string | null;
  address?: string | null;
  phone?: string | null;
  settings?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface EnterpriseMember {
  enterpriseId: string;
  userId: string;
  role: string;
  department?: string | null;
  title?: string | null;
  status?: string | null;
  invitedBy?: string | null;
  joinedAt?: string;
  // Denormalized fields
  userName?: string;
  userEmail?: string;
}

export interface UserEnterprise {
  userId: string;
  enterpriseId: string;
  role: string;
  enterpriseName: string;
  joinedAt?: string;
}

export interface Project {
  id: string;
  enterpriseId?: string;
  projectCode: string;
  name: string;
  description?: string | null;
  methodology: "agile" | "waterfall" | "hybrid";
  projectManager?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: string;
  budgetType?: string | null;
  estimatedHours?: number;
  actualHours?: number;
  budgetAmount?: number;
  actualCost?: number;
  progress: number;
  milestones?: string | null;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Sprint {
  id: string;
  enterpriseId?: string;
  projectId: string;
  name: string;
  goal?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectTask {
  id: string;
  enterpriseId?: string;
  projectId: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  assignedTo?: string | null;
  assignedBy?: string | null;
  watchers?: string[];
  dependencies?: string[];
  estimatedHours?: number;
  actualHours?: number;
  billable?: boolean;
  sprintId?: string | null;
  epicId?: string | null;
  storyPoints?: number;
  dueDate?: string | null;
  category?: string | null;
  tags?: string[];
  comments?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectMember {
  projectId: string;
  enterpriseId?: string;
  userId: string;
  role: string;
  addedAt?: string;
}

export interface InventoryProduct {
  id: string;
  enterpriseId?: string;
  sku: string;
  name: string;
  description?: string | null;
  category?: string | null;
  brand?: string | null;
  variants?: string | null;
  stockLevel: number;
  reorderPoint: number;
  costPrice: number;
  sellingPrice: number;
  unit?: string | null;
  location?: string | null;
  status: string;
  primarySupplier?: string | null;
  barcode?: string | null;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface StockMovement {
  id: string;
  enterpriseId?: string;
  productId: string;
  type: string;
  quantity: number;
  fromLocation?: string | null;
  toLocation?: string | null;
  date?: string | null;
  reason?: string | null;
  performedBy?: string | null;
  createdAt?: string;
}

export interface Order {
  id: string;
  enterpriseId?: string;
  orderNumber: string;
  type: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  items?: string | null;
  subtotal: number;
  taxTotal: number;
  shippingCost: number;
  discount: number;
  totalAmount: number;
  fulfillmentStatus: string;
  paymentStatus: string;
  paymentMethod?: string | null;
  channel?: string | null;
  notes?: string | null;
  shippingAddress?: string | null;
  trackingNumber?: string | null;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CrmContact {
  id: string;
  enterpriseId?: string;
  type: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  companyWebsite?: string | null;
  companySize?: string | null;
  source?: string | null;
  status: string;
  leadScore: number;
  owner?: string | null;
  tags?: string[];
  notes?: string | null;
  address?: string | null;
  lastContacted?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CrmDeal {
  id: string;
  enterpriseId?: string;
  dealName: string;
  contactId?: string | null;
  pipelineId?: string | null;
  stage: string;
  dealValue: number;
  probability: number;
  expectedCloseDate?: string | null;
  status: string;
  products?: string | null;
  owner?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CrmPipeline {
  id: string;
  enterpriseId?: string;
  name: string;
  stages?: string | null;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Invoice {
  id: string;
  enterpriseId?: string;
  invoiceNumber: string;
  orderId?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerAddress?: string | null;
  lineItems?: string | null;
  subtotal: number;
  taxAmount: number;
  discount: number;
  total: number;
  amountPaid: number;
  status: string;
  dueDate?: string | null;
  issuedDate?: string | null;
  paymentTerms?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface InvoicePayment {
  id: string;
  enterpriseId?: string;
  invoiceId: string;
  amount: number;
  method: string;
  reference?: string | null;
  date?: string | null;
  notes?: string | null;
  createdAt?: string;
}

export interface TimeClockEntry {
  id: string;
  enterpriseId?: string;
  userId: string;
  clockInTime?: string | null;
  clockOutTime?: string | null;
  totalHours?: number;
  regularHours?: number;
  overtimeHours?: number;
  breakTime?: number;
  workLocation?: string | null;
  status: string;
  notes?: string | null;
  approvedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaveRequest {
  id: string;
  enterpriseId?: string;
  userId: string;
  type: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
  status: string;
  approvedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Vendor {
  id: string;
  enterpriseId?: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  category?: string | null;
  paymentTerms?: string | null;
  rating: number;
  performance?: string | null;
  status: string;
  notes?: string | null;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PurchaseOrder {
  id: string;
  enterpriseId?: string;
  poNumber: string;
  vendorId: string;
  items?: string | null;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  expectedDate?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Channel {
  id: string;
  enterpriseId?: string;
  name: string;
  type: "public" | "private" | "direct_message";
  description?: string | null;
  projectId?: string | null;
  createdBy?: string | null;
  members: string[];
  pinned: boolean;
  archived: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChannelMessage {
  id: string;
  enterpriseId?: string;
  channelId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: string;
  parentId?: string | null;
  attachments?: string | null;
  reactions?: string | null;
  edited: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Document {
  id: string;
  enterpriseId?: string;
  name: string;
  path?: string | null;
  type: "file" | "folder";
  mimeType?: string | null;
  size?: number;
  version: number;
  versions?: string | null;
  parentId?: string | null;
  uploadedBy?: string | null;
  permissions?: string | null;
  tags?: string[];
  description?: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChartOfAccount {
  id: string;
  enterpriseId?: string;
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  parentId?: string | null;
  balance: number;
  currency?: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AccountingEntry {
  id: string;
  enterpriseId?: string;
  entryNumber: string;
  date: string;
  description: string;
  lineItems?: string | null;
  status: string;
  createdBy?: string | null;
  approvedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ResourceAllocation {
  id: string;
  enterpriseId?: string;
  userId: string;
  projectId: string;
  allocation: number;
  startDate?: string | null;
  endDate?: string | null;
  role?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/* ---- Enterprise Analytics types ----------------------------------- */

export interface EnterpriseDashboardStats {
  projects: { total: number; byStatus: Record<string, number> };
  orders: { total: number; totalAmount: number };
  contacts: { total: number; byType: Record<string, number> };
  deals: { total: number; totalValue: number; byStatus: Record<string, number> };
  invoices: { total: number; totalAmount: number; amountPaid: number; byStatus: Record<string, number> };
  timeClock: { totalEntries: number };
  members: { total: number };
}
