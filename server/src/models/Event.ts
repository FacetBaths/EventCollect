import mongoose, { Schema, Document } from "mongoose";

// Interface for the Event document
export interface IEvent extends Document {
  name: string;
  location?: string;
  startDate?: Date;
  endDate?: Date;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Event Schema
const eventSchema = new Schema<IEvent>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    location: {
      type: String,
      trim: true,
      default: "",
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for performance
eventSchema.index({ isActive: 1 });
eventSchema.index({ createdAt: -1 });

// Ensure only one event can be active at a time
eventSchema.pre('save', async function(next) {
  if (this.isActive && this.isModified('isActive')) {
    // Deactivate all other events
    await mongoose.model('Event').updateMany(
      { _id: { $ne: this._id } },
      { isActive: false }
    );
  }
  next();
});

// Create and export the Event model
export const Event = mongoose.model<IEvent>("Event", eventSchema);

export default Event;
