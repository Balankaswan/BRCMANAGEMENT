import mongoose from 'mongoose';

const loadingSlipSchema = new mongoose.Schema({
  slip_number: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  party: {
    type: String,
    required: true,
    trim: true
  },
  vehicle_no: {
    type: String,
    required: true,
    trim: true
  },
  from_location: {
    type: String,
    required: true,
    trim: true
  },
  to_location: {
    type: String,
    required: true,
    trim: true
  },
  material: {
    type: String,
    trim: true
  },
  dimension: {
    type: String,
    trim: true
  },
  weight: {
    type: Number,
    required: true,
    min: 0
  },
  supplier: {
    type: String,
    required: true,
    trim: true
  },
  freight: {
    type: Number,
    required: true,
    min: 0
  },
  advance: {
    type: Number,
    default: 0,
    min: 0
  },
  balance: {
    type: Number,
    default: 0
  },
  rto: {
    type: Number,
    default: 0,
    min: 0
  },
  total_freight: {
    type: Number,
    required: true,
    min: 0
  },
  narration: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Calculate balance before saving
loadingSlipSchema.pre('save', function(next) {
  this.balance = this.freight - this.advance;
  next();
});

export default mongoose.model('LoadingSlip', loadingSlipSchema);
