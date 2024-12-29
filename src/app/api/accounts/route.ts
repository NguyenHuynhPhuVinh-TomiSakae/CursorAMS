/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

// Khởi tạo kết nối MongoDB
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

if (!uri) {
    throw new Error('Thiếu MONGODB_URI trong biến môi trường');
}

const client = new MongoClient(uri);

export async function GET() {
    try {
        await client.connect();
        const db = client.db(dbName);
        const accounts = await db.collection('accounts').find({}).toArray();

        return NextResponse.json({ accounts });
    } catch (error) {
        console.error('Lỗi MongoDB:', error);
        return NextResponse.json({ error: 'Lỗi khi đọc dữ liệu' }, { status: 500 });
    } finally {
        await client.close();
    }
}

export async function POST(request: Request) {
    try {
        const { accounts } = await request.json();
        await client.connect();
        const db = client.db(dbName);

        // Xóa tất cả documents cũ và thêm mới
        await db.collection('accounts').deleteMany({});
        await db.collection('accounts').insertMany(accounts);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Lỗi MongoDB:', error);
        return NextResponse.json({ error: 'Lỗi khi lưu dữ liệu' }, { status: 500 });
    } finally {
        await client.close();
    }
} 