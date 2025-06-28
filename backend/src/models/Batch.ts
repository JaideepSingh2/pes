import { Schema, model, Document, Types } from "mongoose";

export interface IBatch extends Document {
  name: string;
  course: Types.ObjectId;
  instructor: Types.ObjectId;
  students: Types.ObjectId[];
  assisstant: Types.ObjectId[]; 
}


const batchSchema = new Schema<IBatch>({
  name: { type: String, required: true },
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  instructor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  students: [{ type: Schema.Types.ObjectId, ref: 'User' }],
});

export const Batch = model<IBatch>('Batch', batchSchema);
