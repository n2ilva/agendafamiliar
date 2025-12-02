import { z } from 'zod';

export const UserRoleSchema = z.enum(['admin', 'dependente']);

export const MemberPermissionsSchema = z.object({
    create: z.boolean().optional(),
    edit: z.boolean().optional(),
    delete: z.boolean().optional(),
});

export const FamilyUserSchema = z.object({
    id: z.string(),
    name: z.string().min(1, 'Nome é obrigatório'),
    email: z.string().email('Email inválido').optional(),
    picture: z.string().url().optional().or(z.literal('')),
    profileIcon: z.string().optional(),
    role: UserRoleSchema,
    isGuest: z.boolean(),
    familyId: z.string().optional(),
    joinedAt: z.union([z.date(), z.string(), z.number()]),
    permissions: MemberPermissionsSchema.optional(),
});

export type FamilyUserSchemaType = z.infer<typeof FamilyUserSchema>;
