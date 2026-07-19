import mongoose from 'mongoose';

const constituencySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    state: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

export default mongoose.model('Constituency', constituencySchema);
