import mongoose from 'mongoose'

const emailCampaignSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 20000 },
    recipients: {
      type: [{ type: String, required: true, lowercase: true, trim: true }],
      required: true,
    },
    status: {
      type: String,
      enum: ['sending', 'sent', 'partial', 'failed'],
      default: 'sending',
      required: true,
    },
    sentCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
)

export default mongoose.model('EmailCampaign', emailCampaignSchema)
