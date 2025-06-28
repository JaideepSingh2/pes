import { Schema, model, Document, Types } from "mongoose";

export interface ITicket extends Document {
  student: Types.ObjectId;
  evaluator: Types.ObjectId;
  ta: Types.ObjectId;
  exam: Types.ObjectId;
  message: string;
  status: "open" | "closed";
  createdAt: Date;
}

const ticketSchema = new Schema<ITicket>({
  student: { type: Schema.Types.ObjectId, ref: "User", required: true },
  evaluator: { type: Schema.Types.ObjectId, ref: "User", required: true },
  ta: { type: Schema.Types.ObjectId, ref: "User", required: true },
  exam: { type: Schema.Types.ObjectId, ref: "Exam", required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ["open", "closed"], default: "open" },
  createdAt: { type: Date, default: Date.now },
});


export const Ticket = model<ITicket>("Ticket", ticketSchema);