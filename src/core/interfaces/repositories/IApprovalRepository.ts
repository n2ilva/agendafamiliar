/**
 * Interface do Repositório de Aprovações
 * Define o contrato para operações de persistência de aprovações de tarefas
 * 
 * Princípio SOLID: Dependency Inversion (D)
 */

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface TaskApproval {
  id: string;
  taskId: string;
  taskTitle: string;
  requesterId: string;
  requesterName: string;
  familyId: string;
  status: ApprovalStatus;
  approvedBy?: string;
  approverName?: string;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

// Alias para compatibilidade com Use Cases
export interface ApprovalRequest {
  id: string;
  taskId: string;
  taskTitle: string;
  taskDescription?: string;
  requesterId: string;
  requesterName: string;
  familyId: string;
  status: ApprovalStatus;
  reviewerId?: string;
  reviewerName?: string;
  reviewedAt?: Date;
  comment?: string;
  expiresAt?: Date;
  createdAt: Date;
}

export interface IApprovalRepository {
  /**
   * Busca uma aprovação pelo ID
   */
  findById(id: string): Promise<ApprovalRequest | null>;

  /**
   * Busca aprovação por tarefa
   */
  findByTask(taskId: string): Promise<ApprovalRequest | null>;

  /**
   * Busca aprovação pendente por tarefa
   */
  findPendingByTaskId(taskId: string): Promise<ApprovalRequest | null>;

  /**
   * Busca aprovações pendentes de uma família
   */
  findPendingByFamily(familyId: string): Promise<ApprovalRequest[]>;

  /**
   * Alias para findPendingByFamily
   */
  findPendingByFamilyId(familyId: string): Promise<ApprovalRequest[]>;

  /**
   * Busca aprovações pendentes para um admin
   */
  findPendingForAdmin(adminId: string): Promise<ApprovalRequest[]>;

  /**
   * Busca aprovações solicitadas por um dependente
   */
  findByRequester(requesterId: string): Promise<ApprovalRequest[]>;

  /**
   * Alias para findByRequester
   */
  findByRequesterId(requesterId: string): Promise<ApprovalRequest[]>;

  /**
   * Busca aprovações por status
   */
  findByStatus(status: ApprovalStatus, familyId?: string): Promise<ApprovalRequest[]>;

  /**
   * Cria uma nova solicitação de aprovação
   */
  create(approval: ApprovalRequest): Promise<ApprovalRequest>;

  /**
   * Salva uma nova solicitação de aprovação (alias para create)
   */
  save(approval: ApprovalRequest): Promise<ApprovalRequest>;

  /**
   * Atualiza uma aprovação (aprovar/rejeitar)
   */
  update(id: string, data: Partial<ApprovalRequest>): Promise<ApprovalRequest>;

  /**
   * Remove uma aprovação
   */
  delete(id: string): Promise<void>;

  /**
   * Aprova uma solicitação
   */
  approve(id: string, adminId: string, comment?: string): Promise<ApprovalRequest>;

  /**
   * Rejeita uma solicitação
   */
  reject(id: string, adminId: string, comment?: string): Promise<ApprovalRequest>;

  /**
   * Cancela uma solicitação pendente
   */
  cancel(id: string): Promise<void>;

  /**
   * Conta aprovações pendentes
   */
  countPending(familyId: string): Promise<number>;

  /**
   * Inscreve-se para atualizações de aprovações em tempo real
   */
  subscribeToChanges(
    familyId: string,
    callback: (approvals: ApprovalRequest[]) => void
  ): () => void;
}
