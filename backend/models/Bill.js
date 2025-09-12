import mongoose from 'mongoose';

const advancePaymentSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  amount: { type: Number, required: true, min: 0 },
  mode: { type: String, enum: ['cash', 'bank', 'other'], default: 'cash' },
  reference: { type: String, trim: true },
  description: { type: String, trim: true }
}, { _id: true });

const billSchema = new mongoose.Schema({
  bill_number: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  loading_slip_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LoadingSlip',
    required: true
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
  party_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Party',
    required: false
  },
  party_name: {
    type: String,
    trim: true,
    required: false
  },
  bill_amount: {
    type: Number,
    required: true,
    min: 0
  },
  detention: {
    type: Number,
    default: 0,
    min: 0
  },
  extra: {
    type: Number,
    default: 0,
    min: 0
  },
  rto: {
    type: Number,
    default: 0,
    min: 0
  },
  mamool: {
    type: Number,
    default: 0,
    min: 0
  },
  tds: {
    type: Number,
    default: 0,
    min: 0
  },
  penalties: {
    type: Number,
    default: 0,
    min: 0
  },
  party_commission_cut: {
    type: Number,
    default: 0,
    min: 0
  },
  net_amount: {
    type: Number,
    default: 0
  },
  totalFreight: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'received'],
    default: 'pending'
  },
  received_date: {
    type: Date
  },
  received_amount: {
    type: Number,
    min: 0
  },
  // pod_image removed to optimize storage
  advance_payments: [advancePaymentSchema],
  narration: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Calculate net amount and total freight before saving
billSchema.pre('save', function(next) {
  // Net amount for supplier payment and profit calculation (excludes party commission cut)
  this.net_amount = this.bill_amount + this.detention + this.extra + this.rto - this.mamool - this.penalties - this.tds - this.party_commission_cut;
  // Total freight for PDF display (includes all charges, no deductions)
  this.totalFreight = this.bill_amount + this.detention + this.extra + this.rto;
  next();
});

export default mongoose.model('Bill', billSchema);
