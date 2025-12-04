import { z } from 'zod';

export const TaskStatusSchema = z.enum(['pendente', 'concluida', 'pendente_aprovacao', 'aprovada', 'rejeitada', 'excluida', 'cancelada']);

export const RepeatTypeSchema = z.enum(['none', 'daily', 'weekends', 'custom', 'monthly', 'yearly', 'biweekly', 'interval']);

export const SubtaskSchema = z.object({
    id: z.string(),
    title: z.string().min(1, 'Título é obrigatório'),
    done: z.boolean(),
    dueDate: z.union([z.date(), z.string()]).optional(),
    dueTime: z.union([z.date(), z.string()]).optional(),
    completedById: z.string().optional(),
    completedByName: z.string().optional(),
    completedAt: z.union([z.date(), z.string(), z.number()]).optional(),
});

export const TaskSchema = z.object({
    id: z.string(),
    title: z.string().min(1, 'Título é obrigatório'),
    description: z.string().optional(),
    completed: z.boolean(),
    status: TaskStatusSchema,
    category: z.string(),
    priority: z.enum(['baixa', 'media', 'alta']),
    familyId: z.string().nullable().optional(),
    createdAt: z.union([z.date(), z.string(), z.number()]),
    updatedAt: z.union([z.date(), z.string(), z.number()]),
    completedAt: z.union([z.date(), z.string(), z.number()]).optional(),
    dueDate: z.union([z.date(), z.string()]).optional(),
    dueTime: z.union([z.date(), z.string()]).optional(),

    // Opções de repetição
    repeatOption: z.enum(['nenhum', 'diario', 'semanal', 'mensal', 'anual', 'quinzenal', 'intervalo']).optional(),
    repeatDays: z.array(z.number()).optional(),
    repeatEndDate: z.union([z.date(), z.string()]).optional(),
    repeatIntervalDays: z.number().optional(),
    repeatDurationMonths: z.number().optional(),
    repeatStartDate: z.union([z.date(), z.string()]).optional(),

    userId: z.string(),
    approvalId: z.string().optional(),

    // Subtarefas
    subtasks: z.array(SubtaskSchema).optional(),

    // Campos de autoria
    createdBy: z.string(),
    createdByName: z.string(),
    editedBy: z.string().optional(),
    editedByName: z.string().optional(),
    editedAt: z.union([z.date(), z.string(), z.number()]).optional(),

    private: z.boolean().optional(),
    unlocked: z.boolean().optional(),
    unlockedBy: z.string().optional(),
    unlockedAt: z.union([z.date(), z.string(), z.number()]).optional(),

    deleted: z.boolean().optional(),
    deletedBy: z.string().optional(),
    deletedByName: z.string().optional(),
    deletedAt: z.union([z.date(), z.string(), z.number()]).optional(),
});

export type TaskSchemaType = z.infer<typeof TaskSchema>;
