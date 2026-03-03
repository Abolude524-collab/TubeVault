import mongoose from 'mongoose';

const downloadSchema = new mongoose.Schema(
    {
        videoId: { type: String, required: true },
        title: { type: String, required: true },
        url: { type: String, required: true },
        format: { type: String, enum: ['mp4', 'mp3'], required: true },
        quality: { type: String, default: 'best' },
        thumbnail: { type: String },
        uploader: { type: String },
        downloadedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

export default mongoose.model('Download', downloadSchema);
