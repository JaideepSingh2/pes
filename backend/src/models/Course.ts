import { Schema, model, Document, Types } from "mongoose";

console.log('Course model loaded');

export interface ICourse extends Document {
  name: string;
  code: string;
  startDate: Date;
  endDate: Date
}

const courseSchema = new Schema<ICourse>({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true }
});

export const Course = model<ICourse>("Course", courseSchema);
