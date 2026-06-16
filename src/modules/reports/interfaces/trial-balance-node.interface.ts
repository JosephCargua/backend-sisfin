export interface TrialBalanceNode {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  level: number;
  isControlAccount: boolean;
  initialBalance: number;
  periodDebit: number;
  periodCredit: number;
  debtorBalance: number;
  creditorBalance: number;
  children: TrialBalanceNode[];
}

export interface TrialBalanceReport {
  startDate: string;
  endDate: string;
  rows: TrialBalanceNode[];
  totals: {
    initialBalance: number;
    periodDebit: number;
    periodCredit: number;
    debtorBalance: number;
    creditorBalance: number;
  };
}
