/**
 * Entidade de Domínio: Category
 * Representa uma categoria de tarefa com regras de negócio encapsuladas
 * 
 * Princípio SOLID: Single Responsibility (S)
 * - Gerencia apenas dados e comportamentos da categoria
 */

export interface CategoryProps {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  order: number;
  createdBy?: string;
  familyId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_CATEGORIES: Omit<CategoryProps, 'createdAt' | 'updatedAt'>[] = [
  { id: 'work', name: 'Trabalho', icon: 'briefcase', color: '#4A90D9', isDefault: true, order: 0 },
  { id: 'personal', name: 'Pessoal', icon: 'user', color: '#50C878', isDefault: true, order: 1 },
  { id: 'health', name: 'Saúde', icon: 'heart', color: '#FF6B6B', isDefault: true, order: 2 },
  { id: 'home', name: 'Casa', icon: 'home', color: '#FFB347', isDefault: true, order: 3 },
  { id: 'finance', name: 'Finanças', icon: 'dollar-sign', color: '#9B59B6', isDefault: true, order: 4 },
  { id: 'study', name: 'Estudos', icon: 'book', color: '#3498DB', isDefault: true, order: 5 },
];

export class Category {
  private readonly props: CategoryProps;

  private constructor(props: CategoryProps) {
    this.props = { ...props };
  }

  /**
   * Factory method para criar uma nova categoria
   */
  static create(props: Omit<CategoryProps, 'id' | 'createdAt' | 'updatedAt' | 'isDefault' | 'order'> & { 
    id?: string;
    order?: number;
  }): Category {
    const now = new Date();
    return new Category({
      ...props,
      id: props.id || `cat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      isDefault: false,
      order: props.order ?? 999,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Factory method para reconstruir categoria do armazenamento
   */
  static fromPersistence(props: CategoryProps): Category {
    return new Category(props);
  }

  /**
   * Factory method para criar categoria padrão
   */
  static createDefault(template: Omit<CategoryProps, 'createdAt' | 'updatedAt'>): Category {
    const now = new Date();
    return new Category({
      ...template,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Obtém todas as categorias padrão
   */
  static getDefaults(): Category[] {
    return DEFAULT_CATEGORIES.map(cat => Category.createDefault(cat));
  }

  // ============ Getters ============

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get icon(): string {
    return this.props.icon;
  }

  get color(): string {
    return this.props.color;
  }

  get isDefault(): boolean {
    return this.props.isDefault;
  }

  get order(): number {
    return this.props.order;
  }

  get createdBy(): string | undefined {
    return this.props.createdBy;
  }

  get familyId(): string | undefined {
    return this.props.familyId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // ============ Métodos de Negócio ============

  /**
   * Verifica se a categoria pode ser deletada
   */
  canDelete(): boolean {
    return !this.props.isDefault;
  }

  /**
   * Verifica se a categoria pode ser editada
   */
  canEdit(): boolean {
    return !this.props.isDefault;
  }

  /**
   * Verifica se é uma categoria compartilhada (família)
   */
  isShared(): boolean {
    return !!this.props.familyId;
  }

  /**
   * Verifica se pertence a um usuário específico
   */
  belongsTo(userId: string): boolean {
    return this.props.createdBy === userId;
  }

  /**
   * Atualiza o nome da categoria
   */
  updateName(name: string): Category {
    if (this.isDefault) {
      throw new Error('Não é possível editar categoria padrão');
    }
    
    if (!name || name.trim().length === 0) {
      throw new Error('Nome não pode ser vazio');
    }
    
    if (name.trim().length > 30) {
      throw new Error('Nome não pode ter mais de 30 caracteres');
    }

    return new Category({
      ...this.props,
      name: name.trim(),
      updatedAt: new Date(),
    });
  }

  /**
   * Atualiza o ícone da categoria
   */
  updateIcon(icon: string): Category {
    if (this.isDefault) {
      throw new Error('Não é possível editar categoria padrão');
    }

    return new Category({
      ...this.props,
      icon,
      updatedAt: new Date(),
    });
  }

  /**
   * Atualiza a cor da categoria
   */
  updateColor(color: string): Category {
    if (this.isDefault) {
      throw new Error('Não é possível editar categoria padrão');
    }
    
    // Validação básica de cor hex
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      throw new Error('Cor inválida. Use formato hexadecimal (#RRGGBB)');
    }

    return new Category({
      ...this.props,
      color,
      updatedAt: new Date(),
    });
  }

  /**
   * Atualiza a ordem da categoria
   */
  updateOrder(order: number): Category {
    return new Category({
      ...this.props,
      order,
      updatedAt: new Date(),
    });
  }

  /**
   * Atualiza múltiplos campos
   */
  update(data: Partial<Pick<CategoryProps, 'name' | 'icon' | 'color'>>): Category {
    if (this.isDefault) {
      throw new Error('Não é possível editar categoria padrão');
    }

    return new Category({
      ...this.props,
      ...data,
      updatedAt: new Date(),
    });
  }

  /**
   * Converte para objeto plano (persistência)
   */
  toObject(): CategoryProps {
    return { ...this.props };
  }

  /**
   * Verifica igualdade com outra categoria
   */
  equals(other: Category): boolean {
    return this.props.id === other.id;
  }
}
