import { z } from "zod";

export const Id = z.string().min(1);
export const UserId = z.string().min(1);

export const BaseDoc = z.object({
  userId: UserId,
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

export const Plan = BaseDoc.extend({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().default("Asia/Tokyo"),
});
export type Plan = z.infer<typeof Plan>;

export const TaskState = z.enum(["todo", "doing", "done"]);

export const Task = BaseDoc.extend({
  planId: Id,
  title: z.string().min(1),
  estimateMinutes: z.number().int().min(0).default(0),
  order: z.number().int().min(0).default(0),
  state: TaskState.default("todo"),
  goalId: z.string().optional(),
});
export type Task = z.infer<typeof Task>;

export const Block = BaseDoc.extend({
  planId: Id,
  taskId: z.string().optional(),
  title: z.string().optional(),
  start: z.number().int().min(0), // epoch ms
  end: z.number().int().min(0), // epoch ms
  lockedLength: z.boolean().default(true),
  movable: z.boolean().default(true),
}).refine((b) => b.end > b.start, {
  message: "end must be greater than start",
  path: ["end"],
});
export type Block = z.infer<typeof Block>;

export const Intermission = BaseDoc.extend({
  planId: Id,
  start: z.number().int().min(0),
  end: z.number().int().min(0),
}).refine((i) => i.end > i.start, {
  message: "end must be greater than start",
  path: ["end"],
});
export type Intermission = z.infer<typeof Intermission>;

export const Checkin = BaseDoc.extend({
  planId: Id,
  adherenceRate: z.number().min(0).max(1).default(0),
  carryOverCount: z.number().int().min(0).default(0),
  checked: z.boolean().default(false),
});
export type Checkin = z.infer<typeof Checkin>;

// Input DTOs
export const CreatePlanInput = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
export type CreatePlanInput = z.infer<typeof CreatePlanInput>;

export const CreateTaskInput = z.object({
  planId: Id,
  title: z.string().min(1),
  estimateMinutes: z.number().int().min(0).optional(),
  order: z.number().int().min(0).optional(),
  goalId: z.string().optional(),
});
export type CreateTaskInput = z.infer<typeof CreateTaskInput>;

export const UpdateTaskInput = z.object({
  title: z.string().min(1).optional(),
  estimateMinutes: z.number().int().min(0).optional(),
  order: z.number().int().min(0).optional(),
  state: TaskState.optional(),
  goalId: z.string().optional(),
});
export type UpdateTaskInput = z.infer<typeof UpdateTaskInput>;

export const CreateBlockInput = z.object({
  planId: Id,
  taskId: z.string().optional(),
  title: z.string().optional(),
  start: z.number().int().min(0),
  end: z.number().int().min(0),
  lockedLength: z.boolean().optional(),
  movable: z.boolean().optional(),
});
export type CreateBlockInput = z.infer<typeof CreateBlockInput>;

export const UpdateBlockInput = z
  .object({
    taskId: z.string().optional(),
    title: z.string().optional(),
    start: z.number().int().min(0).optional(),
    end: z.number().int().min(0).optional(),
    lockedLength: z.boolean().optional(),
    movable: z.boolean().optional(),
  })
  .refine(
    (v) => !(v.start !== undefined && v.end !== undefined) || v.end! > v.start!,
    {
      message: "end must be greater than start",
      path: ["end"],
    },
  );
export type UpdateBlockInput = z.infer<typeof UpdateBlockInput>;
