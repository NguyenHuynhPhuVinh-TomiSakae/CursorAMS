'use client';

import { useState, useEffect } from 'react';

interface Account {
  id: string;
  name: string;
  isUsed: boolean;
  lastUsedDate: Date | null;
  createdDate: Date;
  isOldAccount: boolean;
}

export default function AccountManager() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [newAccountName, setNewAccountName] = useState('');

  useEffect(() => {
    // Kiểm tra và cập nhật trạng thái tài khoản mỗi khi component mount
    const checkAccountStatus = (accounts: Account[]) => {
      const now = new Date();

      return accounts.map(account => {
        const createdDate = new Date(account.createdDate);
        const timeDiff = now.getTime() - createdDate.getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        // Kiểm tra tài khoản mới -> cũ
        if (!account.isOldAccount && daysDiff >= 14) {
          return {
            ...account,
            isOldAccount: true
          };
        }

        // Kiểm tra reset trạng thái tài khoản cũ
        if (account.isOldAccount && account.isUsed && account.lastUsedDate) {
          const lastUsedDate = new Date(account.lastUsedDate);
          const timeSinceLastUse = now.getTime() - lastUsedDate.getTime();
          const daysSinceLastUse = Math.floor(timeSinceLastUse / (1000 * 60 * 60 * 24));

          if (daysSinceLastUse >= 30) {
            return {
              ...account,
              isUsed: false,
              lastUsedDate: null
            };
          }
        }

        return account;
      });
    };

    const fetchAccounts = async () => {
      try {
        const response = await fetch('/api/accounts');
        const data = await response.json();
        const updatedAccounts = checkAccountStatus(data.accounts);

        // Nếu có tài khoản được cập nhật, lưu lại vào database
        if (JSON.stringify(data.accounts) !== JSON.stringify(updatedAccounts)) {
          await saveAccounts(updatedAccounts);
        }

        setAccounts(updatedAccounts);
      } catch (error) {
        console.error('Lỗi khi đọc dữ liệu:', error);
      }
    };

    fetchAccounts();
  }, []);

  const saveAccounts = async (updatedAccounts: Account[]) => {
    try {
      await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accounts: updatedAccounts }),
      });
    } catch (error) {
      console.error('Lỗi khi lưu dữ liệu:', error);
    }
  };

  const addAccount = async () => {
    if (newAccountName.trim()) {
      const newAccount: Account = {
        id: Date.now().toString(),
        name: newAccountName.trim(),
        isUsed: false,
        lastUsedDate: null,
        createdDate: new Date(),
        isOldAccount: false
      };
      const updatedAccounts = [...accounts, newAccount];
      setAccounts(updatedAccounts);
      await saveAccounts(updatedAccounts);
      setNewAccountName('');
    }
  };

  const toggleAccountStatus = async (id: string) => {
    const updatedAccounts = accounts.map(account => {
      if (account.id === id) {
        const now = new Date();
        const createdDate = new Date(account.createdDate);
        const timeDiff = now.getTime() - createdDate.getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        if (!account.isOldAccount && daysDiff < 14) {
          alert('Tài khoản mới chỉ có thể sử dụng sau 2 tuần kể từ ngày tạo');
          return account;
        }

        return {
          ...account,
          isUsed: !account.isUsed,
          lastUsedDate: !account.isUsed ? new Date() : null
        };
      }
      return account;
    });
    setAccounts(updatedAccounts);
    await saveAccounts(updatedAccounts);
  };

  const AccountItem = ({ account, onToggle }: { account: Account, onToggle: (id: string) => void }) => {
    const now = new Date();
    const createdDate = new Date(account.createdDate);
    const timeDiff = now.getTime() - createdDate.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const canUse = account.isOldAccount || daysDiff >= 14;

    // Tính số ngày còn lại trước khi tự động reset (cho tài khoản cũ)
    const getDaysUntilReset = () => {
      if (account.isOldAccount && account.isUsed && account.lastUsedDate) {
        const lastUsedDate = new Date(account.lastUsedDate);
        const timeSinceLastUse = now.getTime() - lastUsedDate.getTime();
        const daysSinceLastUse = Math.floor(timeSinceLastUse / (1000 * 60 * 60 * 24));
        return 30 - daysSinceLastUse;
      }
      return null;
    };

    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const daysUntilReset = getDaysUntilReset();

    return (
      <div className="p-6 border-b border-gray-700 last:border-b-0 flex items-center justify-between hover:bg-gray-750">
        <div>
          <span className="font-medium text-white">{account.name}</span>
          {account.lastUsedDate && (
            <p className="text-sm text-gray-400 mt-1">
              Đã sử dụng: {formatDate(account.lastUsedDate)}
              {daysUntilReset !== null && account.isUsed && (
                <span className="text-yellow-400 ml-2">
                  (Tự động reset sau {daysUntilReset} ngày)
                </span>
              )}
            </p>
          )}
          {!account.isOldAccount && (
            <p className="text-sm text-gray-400 mt-1">
              Ngày tạo: {formatDate(createdDate)}
              {!canUse && ` (Còn ${14 - daysDiff} ngày nữa mới có thể sử dụng)`}
            </p>
          )}
        </div>
        <button
          onClick={() => onToggle(account.id)}
          disabled={!canUse}
          className={`px-5 py-2.5 rounded-lg transition-colors duration-200 ${!canUse
            ? 'bg-gray-600 cursor-not-allowed'
            : account.isUsed
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
        >
          {account.isUsed ? 'Đang sử dụng' : 'Chưa sử dụng'}
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center text-white">Quản Lý Tài Khoản Cursor</h1>

        {/* Form thêm tài khoản */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-6 border border-gray-700">
          <div className="flex gap-3">
            <input
              type="text"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              placeholder="Nhập tên tài khoản mới"
              className="flex-1 p-3 border rounded-lg bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addAccount}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Thêm
            </button>
          </div>
        </div>

        {/* Danh sách tài khoản */}
        <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-2">Tài khoản cũ</h2>
            {accounts.filter(a => a.isOldAccount).map(account => (
              <AccountItem key={account.id} account={account} onToggle={toggleAccountStatus} />
            ))}
          </div>

          <div className="p-4">
            <h2 className="text-xl font-semibold text-white mb-2">Tài khoản mới</h2>
            {accounts.filter(a => !a.isOldAccount).map(account => (
              <AccountItem key={account.id} account={account} onToggle={toggleAccountStatus} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
