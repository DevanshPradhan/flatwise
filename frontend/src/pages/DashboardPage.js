import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Plus, ShoppingCart, Utensils, Home, Zap, Film, MoreVertical, Users, LogOut, TrendingUp, Wallet } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const categoryIcons = {
  'Food': Utensils,
  'Groceries': ShoppingCart,
  'Utilities': Zap,
  'Rent': Home,
  'Entertainment': Film
};

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [editExpenseOpen, setEditExpenseOpen] = useState(false);
  const [currentExpense, setCurrentExpense] = useState(null);
  
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [summaryRes, expensesRes, usersRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/expenses/summary/current`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/expenses`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/users`, { withCredentials: true })
      ]);
      setSummary(summaryRes.data);
      setExpenses(expensesRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${BACKEND_URL}/api/expenses`,
        { title, amount: parseFloat(amount), category, participants },
        { withCredentials: true }
      );
      toast.success('Expense added successfully');
      setAddExpenseOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Failed to add expense');
    }
  };

  const handleEditExpense = async (e) => {
    e.preventDefault();
    try {
      await axios.put(
        `${BACKEND_URL}/api/expenses/${currentExpense.id}`,
        { title, amount: parseFloat(amount), category, participants },
        { withCredentials: true }
      );
      toast.success('Expense updated successfully');
      setEditExpenseOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error updating expense:', error);
      toast.error('Failed to update expense');
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/expenses/${expenseId}`, { withCredentials: true });
      toast.success('Expense deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  const openEditDialog = (expense) => {
    setCurrentExpense(expense);
    setTitle(expense.title);
    setAmount(expense.amount.toString());
    setCategory(expense.category);
    setParticipants(expense.participants);
    setEditExpenseOpen(true);
  };

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setCategory('');
    setParticipants([]);
    setCurrentExpense(null);
  };

  const toggleParticipant = (userId) => {
    setParticipants(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleToggleUserActive = async (userId) => {
    try {
      await axios.patch(`${BACKEND_URL}/api/users/${userId}/toggle-active`, {}, { withCredentials: true });
      toast.success('Member status updated');
      fetchData();
    } catch (error) {
      console.error('Error toggling user:', error);
      toast.error('Failed to update member status');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F9F8F6' }}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#4A6741' }}></div>
          <p className="mt-4 text-lg" style={{ color: '#6B6862' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F9F8F6', fontFamily: 'IBM Plex Sans, sans-serif' }}>
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)', borderColor: '#E5E0D8' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl tracking-tight font-medium" style={{ fontFamily: 'Manrope, sans-serif', color: '#2D2C2A' }}>
            Flat Ledger
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm" style={{ color: '#6B6862' }}>Hi, {user.name}</span>
            <Button
              onClick={logout}
              variant="ghost"
              size="icon"
              className="rounded-full"
              data-testid="logout-button"
            >
              <LogOut size={20} style={{ color: '#6B6862' }} />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border rounded-2xl shadow-sm p-6 sm:p-8 hover:-translate-y-1 hover:shadow-lg transition-all duration-300" style={{ borderColor: '#E5E0D8' }} data-testid="total-expenses-card">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp size={24} style={{ color: '#4A6741' }} />
              <p className="text-sm tracking-wide" style={{ color: '#6B6862' }}>Total Group Expenses</p>
            </div>
            <p className="text-4xl tracking-tight font-light" style={{ fontFamily: 'Manrope, sans-serif', color: '#2D2C2A' }}>
              {formatCurrency(summary?.total_group_expenses || 0)}
            </p>
            <p className="text-xs mt-2" style={{ color: '#6B6862' }}>Current month</p>
          </div>

          <div className="bg-white border rounded-2xl shadow-sm p-6 sm:p-8 hover:-translate-y-1 hover:shadow-lg transition-all duration-300" style={{ borderColor: '#E5E0D8' }} data-testid="my-share-card">
            <div className="flex items-center gap-3 mb-4">
              <Wallet size={24} style={{ color: '#C25E3E' }} />
              <p className="text-sm tracking-wide" style={{ color: '#6B6862' }}>My Share</p>
            </div>
            <p className="text-4xl tracking-tight font-light" style={{ fontFamily: 'Manrope, sans-serif', color: '#2D2C2A' }}>
              {formatCurrency(summary?.my_share || 0)}
            </p>
          </div>

          <div className="bg-white border rounded-2xl shadow-sm p-6 sm:p-8 hover:-translate-y-1 hover:shadow-lg transition-all duration-300" style={{ borderColor: '#E5E0D8' }} data-testid="balance-card">
            <div className="flex items-center gap-3 mb-4">
              <Users size={24} style={{ color: '#7BA4B6' }} />
              <p className="text-sm tracking-wide" style={{ color: '#6B6862' }}>Balance</p>
            </div>
            <p className="text-4xl tracking-tight font-light" style={{ fontFamily: 'Manrope, sans-serif', color: summary?.balance >= 0 ? '#4A6741' : '#C25E3E' }}>
              {formatCurrency(Math.abs(summary?.balance || 0))}
            </p>
            <p className="text-xs mt-2" style={{ color: '#6B6862' }}>
              {summary?.balance >= 0 ? 'You are owed' : 'You owe'}
            </p>
          </div>

          <div className="bg-white border rounded-2xl shadow-sm p-6 sm:p-8 flex items-center justify-center hover:-translate-y-1 hover:shadow-lg transition-all duration-300" style={{ borderColor: '#E5E0D8' }}>
            <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
              <DialogTrigger asChild>
                <Button
                  className="rounded-full px-6 py-2.5 font-medium transition-colors focus:ring-2 focus:ring-offset-2"
                  style={{ backgroundColor: '#4A6741', color: 'white' }}
                  data-testid="add-expense-button"
                >
                  <Plus size={20} className="mr-2" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E0D8' }}>
                <DialogHeader>
                  <DialogTitle style={{ fontFamily: 'Manrope, sans-serif', color: '#2D2C2A' }}>Add New Expense</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddExpense} className="space-y-4" data-testid="add-expense-form">
                  <div>
                    <Label htmlFor="title" style={{ color: '#2D2C2A' }}>Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      className="mt-1"
                      style={{ backgroundColor: '#F9F8F6', borderColor: '#E5E0D8', color: '#2D2C2A' }}
                      data-testid="expense-title-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="amount" style={{ color: '#2D2C2A' }}>Amount (₹)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      className="mt-1"
                      style={{ backgroundColor: '#F9F8F6', borderColor: '#E5E0D8', color: '#2D2C2A' }}
                      data-testid="expense-amount-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category" style={{ color: '#2D2C2A' }}>Category</Label>
                    <Select value={category} onValueChange={setCategory} required>
                      <SelectTrigger className="mt-1" style={{ backgroundColor: '#F9F8F6', borderColor: '#E5E0D8', color: '#2D2C2A' }} data-testid="expense-category-select">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E0D8' }}>
                        <SelectItem value="Food" data-testid="category-food">Food</SelectItem>
                        <SelectItem value="Groceries" data-testid="category-groceries">Groceries</SelectItem>
                        <SelectItem value="Utilities" data-testid="category-utilities">Utilities</SelectItem>
                        <SelectItem value="Rent" data-testid="category-rent">Rent</SelectItem>
                        <SelectItem value="Entertainment" data-testid="category-entertainment">Entertainment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label style={{ color: '#2D2C2A' }}>Participants</Label>
                    <div className="mt-2 space-y-2">
                      {users.filter(u => u.is_active).map((u) => (
                        <div key={u.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`participant-${u.id}`}
                            checked={participants.includes(u.id)}
                            onCheckedChange={() => toggleParticipant(u.id)}
                            data-testid={`participant-checkbox-${u.id}`}
                          />
                          <label htmlFor={`participant-${u.id}`} className="text-sm" style={{ color: '#2D2C2A' }}>
                            {u.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full rounded-full px-6 py-2.5 font-medium transition-colors"
                    style={{ backgroundColor: '#4A6741', color: 'white' }}
                    data-testid="submit-expense-button"
                  >
                    Add Expense
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white border rounded-2xl shadow-sm p-6 sm:p-8" style={{ borderColor: '#E5E0D8' }}>
            <h2 className="text-xl sm:text-2xl tracking-tight font-medium mb-6" style={{ fontFamily: 'Manrope, sans-serif', color: '#2D2C2A' }}>
              Recent Expenses
            </h2>
            <div className="space-y-4" data-testid="expenses-list">
              {expenses.length === 0 ? (
                <p className="text-center py-8" style={{ color: '#6B6862' }}>No expenses yet. Add your first expense!</p>
              ) : (
                expenses.map((expense) => {
                  const Icon = categoryIcons[expense.category] || ShoppingCart;
                  return (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-4 rounded-xl border hover:shadow-md transition-shadow"
                      style={{ borderColor: '#E5E0D8', backgroundColor: '#FFFFFF' }}
                      data-testid="expense-item"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-full" style={{ backgroundColor: '#F9F8F6' }}>
                          <Icon size={20} style={{ color: '#4A6741' }} />
                        </div>
                        <div>
                          <p className="font-medium" style={{ color: '#2D2C2A' }}>{expense.title}</p>
                          <p className="text-sm" style={{ color: '#6B6862' }}>
                            {expense.category} • Paid by {expense.paid_by_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium" style={{ color: '#2D2C2A' }}>{formatCurrency(expense.amount)}</p>
                          <p className="text-sm" style={{ color: '#6B6862' }}>Split: {formatCurrency(expense.split_amount)}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full" data-testid="expense-menu-button">
                              <MoreVertical size={16} style={{ color: '#6B6862' }} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E0D8' }}>
                            <DropdownMenuItem onClick={() => openEditDialog(expense)} data-testid="edit-expense-button">
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteExpense(expense.id)} style={{ color: '#C25E3E' }} data-testid="delete-expense-button">
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-white border rounded-2xl shadow-sm p-6 sm:p-8" style={{ borderColor: '#E5E0D8' }}>
            <h2 className="text-xl sm:text-2xl tracking-tight font-medium mb-6" style={{ fontFamily: 'Manrope, sans-serif', color: '#2D2C2A' }}>
              Members
            </h2>
            <div className="space-y-4" data-testid="members-list">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: '#E5E0D8', backgroundColor: u.is_active ? '#FFFFFF' : '#F9F8F6' }} data-testid="member-item">
                  <div>
                    <p className="font-medium" style={{ color: '#2D2C2A' }}>{u.name}</p>
                    <p className="text-sm" style={{ color: '#6B6862' }}>{u.is_active ? 'Active' : 'Inactive'}</p>
                  </div>
                  <Button
                    onClick={() => handleToggleUserActive(u.id)}
                    variant="ghost"
                    size="sm"
                    className="rounded-full"
                    style={{ color: u.is_active ? '#C25E3E' : '#4A6741' }}
                    data-testid="toggle-member-button"
                  >
                    {u.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {summary?.category_breakdown && Object.keys(summary.category_breakdown).length > 0 && (
          <div className="bg-white border rounded-2xl shadow-sm p-6 sm:p-8" style={{ borderColor: '#E5E0D8' }}>
            <h2 className="text-xl sm:text-2xl tracking-tight font-medium mb-6" style={{ fontFamily: 'Manrope, sans-serif', color: '#2D2C2A' }}>
              Category Breakdown
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(summary.category_breakdown).map(([cat, value]) => {
                const Icon = categoryIcons[cat] || ShoppingCart;
                return (
                  <div key={cat} className="p-4 rounded-xl border text-center" style={{ borderColor: '#E5E0D8' }} data-testid="category-item">
                    <Icon size={24} className="mx-auto mb-2" style={{ color: '#4A6741' }} />
                    <p className="text-sm mb-1" style={{ color: '#6B6862' }}>{cat}</p>
                    <p className="font-medium" style={{ color: '#2D2C2A' }}>{formatCurrency(value)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <Dialog open={editExpenseOpen} onOpenChange={setEditExpenseOpen}>
        <DialogContent className="sm:max-w-md" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E0D8' }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Manrope, sans-serif', color: '#2D2C2A' }}>Edit Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditExpense} className="space-y-4" data-testid="edit-expense-form">
            <div>
              <Label htmlFor="edit-title" style={{ color: '#2D2C2A' }}>Title</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mt-1"
                style={{ backgroundColor: '#F9F8F6', borderColor: '#E5E0D8', color: '#2D2C2A' }}
                data-testid="edit-expense-title-input"
              />
            </div>
            <div>
              <Label htmlFor="edit-amount" style={{ color: '#2D2C2A' }}>Amount (₹)</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="mt-1"
                style={{ backgroundColor: '#F9F8F6', borderColor: '#E5E0D8', color: '#2D2C2A' }}
                data-testid="edit-expense-amount-input"
              />
            </div>
            <div>
              <Label htmlFor="edit-category" style={{ color: '#2D2C2A' }}>Category</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger className="mt-1" style={{ backgroundColor: '#F9F8F6', borderColor: '#E5E0D8', color: '#2D2C2A' }} data-testid="edit-expense-category-select">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E0D8' }}>
                  <SelectItem value="Food">Food</SelectItem>
                  <SelectItem value="Groceries">Groceries</SelectItem>
                  <SelectItem value="Utilities">Utilities</SelectItem>
                  <SelectItem value="Rent">Rent</SelectItem>
                  <SelectItem value="Entertainment">Entertainment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label style={{ color: '#2D2C2A' }}>Participants</Label>
              <div className="mt-2 space-y-2">
                {users.filter(u => u.is_active).map((u) => (
                  <div key={u.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-participant-${u.id}`}
                      checked={participants.includes(u.id)}
                      onCheckedChange={() => toggleParticipant(u.id)}
                      data-testid={`edit-participant-checkbox-${u.id}`}
                    />
                    <label htmlFor={`edit-participant-${u.id}`} className="text-sm" style={{ color: '#2D2C2A' }}>
                      {u.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <Button
              type="submit"
              className="w-full rounded-full px-6 py-2.5 font-medium transition-colors"
              style={{ backgroundColor: '#4A6741', color: 'white' }}
              data-testid="submit-edit-expense-button"
            >
              Update Expense
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}