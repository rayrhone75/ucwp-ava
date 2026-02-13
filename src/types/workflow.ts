export type Intent =
  | 'pricing'
  | 'file_prep'
  | 'turnaround'
  | 'dtf_info'
  | 'gang_sheet'
  | 'refund'
  | 'order_status'
  | 'general'
  | 'greeting';

export interface WorkflowResult {
  intent: Intent;
  questions: string[];
  actions: {
    label: string;
    url?: string;
    type: 'link' | 'info' | 'action';
  }[];
}
