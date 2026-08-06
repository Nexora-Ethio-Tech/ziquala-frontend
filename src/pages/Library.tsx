
import { Book, Search, Plus, CheckCircle, Clock, RefreshCw, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { formatEthiopianLabel } from '../utils/ethiopianCalendar';
import { API_HOST_URL } from '../config/api';

interface BookType {
  id: string;
  title: string;
  author: string;
  book_code?: string;
  status: string;
  shelf: string;
  total: number;
  available: number;
}

interface AvailableBook {
  id: string;
  title: string;
  author: string;
  book_code: string;
  available: number;
  shelf: string;
}

interface LoanType {
  id: string;
  book_id: string;
  student_id: string | null;
  teacher_id: string | null;
  borrower_type: string;
  borrower_name: string;
  book_title: string;
  book_code: string;
  student_school_id?: string;
  borrowed_at: string;
  due_date: string;
  returned_at: string | null;
  days_overdue: number;
  fine_amount: number;
}

export const Library = () => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'loans'>('catalog');
  const [books, setBooks] = useState<BookType[]>([]);
  const [availableBooks, setAvailableBooks] = useState<AvailableBook[]>([]);
  const [loans, setLoans] = useState<LoanType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [issueData, setIssueData] = useState({ book_id: '', borrower_id: '', borrower_type: 'student', due_date: '' });
  const [bookSearch, setBookSearch] = useState('');
  const [showBookDropdown, setShowBookDropdown] = useState(false);
  const [borrowerValidation, setBorrowerValidation] = useState<{ valid: boolean; message: string; name?: string }>({ valid: true, message: '' });
  const [formError, setFormError] = useState('');
  const [addBookData, setAddBookData] = useState({
    title: '',
    author: '',
    shelf: '',
    quantity: 1
  });

  const API_URL = API_HOST_URL || '';

  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem('ziquala_token');
    try {
      const [booksRes, loansRes, availableRes] = await Promise.all([
        fetch(`${API_URL}/api/library/books`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/library/loans`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/library/available-books`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (booksRes.ok) {
        const resJson = await booksRes.json();
        setBooks(resJson.data || []);
      }
      if (loansRes.ok) {
        const resJson = await loansRes.json();
        setLoans(resJson.data || []);
      }
      if (availableRes.ok) {
        const resJson = await availableRes.json();
        setAvailableBooks(resJson.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch library data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('ziquala_token');
    try {
      const res = await fetch(`${API_URL}/api/library/add-book`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: addBookData.title,
          author: addBookData.author,
          shelf_location: addBookData.shelf,
          stock: addBookData.quantity
        })
      });
      if (res.ok) {
        setShowAddBookModal(false);
        setAddBookData({ title: '', author: '', shelf: '', quantity: 1 });
        fetchData();
        alert('Book added successfully!');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add book');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to add book');
    }
  };

  const handleValidateBorrower = async () => {
    if (!issueData.borrower_id.trim()) {
      setBorrowerValidation({ valid: false, message: 'Borrower ID is required.' });
      return;
    }

    const token = localStorage.getItem('ziquala_token');
    const endpoint = issueData.borrower_type === 'teacher'
      ? `${API_URL}/api/library/validate-teacher/${encodeURIComponent(issueData.borrower_id.trim())}`
      : `${API_URL}/api/library/validate-student/${encodeURIComponent(issueData.borrower_id.trim())}`;

    try {
      const res = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setBorrowerValidation({ valid: false, message: data.message || 'This ID is not valid.' });
      } else {
        setBorrowerValidation({ valid: true, message: `${issueData.borrower_type === 'teacher' ? 'Teacher' : 'Student'} found: ${data[issueData.borrower_type]?.name || data[issueData.borrower_type]?.digital_id || ''}`, name: data[issueData.borrower_type]?.name });
      }
    } catch (err) {
      console.error('Borrower validation failed:', err);
      setBorrowerValidation({ valid: false, message: 'Failed to validate borrower. Please try again.' });
    }
  };

  const handleIssueBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!issueData.book_id) {
      setFormError('Please select a book to issue.');
      return;
    }
    if (!issueData.borrower_id.trim()) {
      setFormError('Please enter a student or teacher ID.');
      return;
    }
    if (!issueData.due_date) {
      setFormError('Please choose a due date.');
      return;
    }

    const token = localStorage.getItem('ziquala_token');
    try {
      const res = await fetch(`${API_URL}/api/library/issue`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          book_id: issueData.book_id,
          borrower_id: issueData.borrower_id.trim(),
          borrower_type: issueData.borrower_type,
          due_date: issueData.due_date
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowIssueModal(false);
        setIssueData({ book_id: '', borrower_id: '', borrower_type: 'student', due_date: '' });
        setBookSearch('');
        setBorrowerValidation({ valid: true, message: '' });
        fetchData();
      } else {
        setFormError(data.error || data.message || 'Failed to issue book');
      }
    } catch (err) {
      console.error(err);
      setFormError('Failed to issue book. Please try again.');
    }
  };

  const handleReturnBook = async (loanId: string) => {
    const token = localStorage.getItem('ziquala_token');
    try {
      const res = await fetch(`${API_URL}/api/library/return/${loanId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to return book');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const overdueLoans = loans.filter(l => !l.returned_at && new Date(l.due_date) < new Date());

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Library Management</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Organize school books, track loans, and manage resources.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            title="Refresh library data"
            onClick={fetchData}
            className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          {activeTab === 'catalog' ? (
            <button
              onClick={() => setShowAddBookModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors font-bold text-sm"
            >
              <Plus size={18} />
              <span>Add Book</span>
            </button>
          ) : (
            <button
              onClick={() => setShowIssueModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors font-bold text-sm"
            >
              <Plus size={18} />
              <span>Issue Book</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'catalog'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
        >
          Book Catalog
        </button>
        <button
          onClick={() => setActiveTab('loans')}
          className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'loans'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
        >
          Active Loans
          {overdueLoans.length > 0 && (
            <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full text-[10px]">
              {overdueLoans.length} Overdue
            </span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-2xl text-white shadow-lg">
          <p className="text-blue-100 text-sm font-medium">Total Collection</p>
          <h3 className="text-3xl font-bold mt-1">{books.length} Books</h3>
          <div className="mt-4 flex items-center gap-2 text-xs text-blue-100">
            <Book size={14} />
            <span>Inventory across all branches</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Currently Borrowed</p>
          <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-1">{loans.filter(l => !l.returned_at).length}</h3>
          <div className="mt-4 flex items-center gap-2 text-xs text-amber-600">
            <Clock size={14} />
            <span>{overdueLoans.length} Overdue returns</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Available Now</p>
          <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-1">{books.reduce((acc, b) => acc + (b.available || 0), 0)}</h3>
          <div className="mt-4 flex items-center gap-2 text-xs text-emerald-600 font-medium">
            <CheckCircle size={14} />
            <span>Ready for checkout</span>
          </div>
        </div>
      </div>

      {activeTab === 'catalog' ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search by title or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none w-full"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Book Info</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Shelf / Book ID</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Stock</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredBooks.map((book) => (
                  <tr key={book.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{book.title}</p>
                      <p className="text-xs text-slate-500">{book.author}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[10px] text-blue-500 font-bold uppercase">Rack: {book.shelf || 'Unknown'}</p>
                      <p className="text-xs font-mono text-slate-500 mt-2">{book.book_code || ''}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold">{book.available} / {book.total}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${book.available > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                        {book.available > 0 ? 'Available' : 'Out of Stock'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setIssueData({ ...issueData, book_id: book.id });
                          setShowIssueModal(true);
                        }}
                        disabled={book.available <= 0}
                        className="text-blue-600 hover:text-blue-800 disabled:opacity-50 text-xs font-bold"
                      >
                        Issue
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Student / Book</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Dates</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loans.map((loan) => (
                  <tr key={loan.id} className={!loan.returned_at && new Date(loan.due_date) < new Date() ? 'bg-rose-50/30' : ''}>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold dark:text-slate-100">{loan.borrower_name}</p>
                      <p className="text-xs uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500 font-bold mb-1">{loan.borrower_type === 'teacher' ? 'Teacher' : 'Student'}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{loan.book_title}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-500 uppercase font-bold">Due: {formatEthiopianLabel(loan.due_date)}</p>
                      {loan.returned_at && <p className="text-sm text-emerald-600 uppercase font-bold mt-1">Returned: {formatEthiopianLabel(loan.returned_at)}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1.5 rounded-full text-xs font-bold uppercase ${loan.returned_at ? 'bg-emerald-100 text-emerald-700' :
                          new Date(loan.due_date) < new Date() ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                        {loan.returned_at ? 'Returned' : new Date(loan.due_date) < new Date() ? 'Overdue' : 'Borrowed'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!loan.returned_at && (
                        <button
                          onClick={() => handleReturnBook(loan.id)}
                          className="bg-emerald-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-emerald-700 transition-colors"
                        >
                          Mark Return
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Issue Book</h3>
            <form onSubmit={handleIssueBook} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase">Select Book</label>
                <div className="relative">
                  <input
                    type="text"
                    value={bookSearch}
                    onChange={(e) => {
                      setBookSearch(e.target.value);
                      setShowBookDropdown(true);
                    }}
                    onFocus={() => setShowBookDropdown(true)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                    placeholder="Search by Book ID, title or author..."
                    aria-label="Search available books"
                    required
                  />
                  {showBookDropdown && (
                    <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                      {availableBooks.filter((book) =>
                        `${book.book_code} ${book.title} ${book.author}`.toLowerCase().includes(bookSearch.toLowerCase())
                      ).map((book) => (
                        <button
                          key={book.id}
                          type="button"
                          onClick={() => {
                            setIssueData({ ...issueData, book_id: book.id });
                            setBookSearch(`${book.book_code} — ${book.title}`);
                            setShowBookDropdown(false);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-slate-100">{book.book_code} — {book.title}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{book.author}</p>
                            </div>
                            <span className="text-xs text-emerald-600">{book.available} available</span>
                          </div>
                        </button>
                      ))}
                      {availableBooks.filter((book) =>
                        `${book.book_code} ${book.title} ${book.author}`.toLowerCase().includes(bookSearch.toLowerCase())
                      ).length === 0 && (
                        <div className="p-4 text-sm text-slate-500 dark:text-slate-400">No available books match your search.</div>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500">Selected Book ID: <span className="font-mono">{issueData.book_id || 'None'}</span></p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Borrower Type</label>
                  <select
                    title="Select borrower type (Student or Staff)"
                    value={issueData.borrower_type}
                    onChange={(e) => {
                      setIssueData({ ...issueData, borrower_type: e.target.value, borrower_id: '' });
                      setBorrowerValidation({ valid: true, message: '' });
                    }}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Student/Teacher ID</label>
                  <input
                    type="text"
                    value={issueData.borrower_id}
                    onChange={(e) => {
                      setIssueData({ ...issueData, borrower_id: e.target.value });
                      setBorrowerValidation({ valid: true, message: '' });
                    }}
                    onBlur={handleValidateBorrower}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                    placeholder="Enter student or teacher ID"
                    required
                  />
                  {borrowerValidation.message && (
                    <p className={`mt-2 text-xs ${borrowerValidation.valid ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {borrowerValidation.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Due Date</label>
                <input
                  type="date"
                  title="Set book due date"
                  placeholder="Select due date"
                  value={issueData.due_date}
                  onChange={(e) => setIssueData({ ...issueData, due_date: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                  required
                />
              </div>

              {formError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {formError}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowIssueModal(false);
                    setFormError('');
                    setBorrowerValidation({ valid: true, message: '' });
                    setBookSearch('');
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700"
                >
                  Confirm Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Add New Book</h3>
              <button
                type="button"
                title="Close add book modal"
                onClick={() => setShowAddBookModal(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddBook} className="space-y-6">
              {/* Book Information Section */}
              <div className="border-b border-slate-200 dark:border-slate-700 pb-6">
                <h4 className="text-sm font-bold text-slate-500 uppercase mb-4">Book Information</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Book Name</label>
                    <input
                      type="text"
                      value={addBookData.title}
                      onChange={(e) => setAddBookData({ ...addBookData, title: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="e.g., The Great Gatsby"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Author</label>
                    <input
                      type="text"
                      value={addBookData.author}
                      onChange={(e) => setAddBookData({ ...addBookData, author: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="e.g., F. Scott Fitzgerald"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Shelf Number</label>
                    <input
                      type="text"
                      value={addBookData.shelf}
                      onChange={(e) => setAddBookData({ ...addBookData, shelf: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="e.g., A-5-12"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Quantity Management Section */}
              <div className="pb-6">
                <h4 className="text-sm font-bold text-slate-500 uppercase mb-4">Available Copies</h4>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Number of Copies</label>
                  <input
                    type="number"
                    title="Set the number of book copies available"
                    placeholder="Enter number of copies"
                    value={addBookData.quantity}
                    onChange={(e) => setAddBookData({ ...addBookData, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    min={1}
                    required
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">This will set the initial available copies of this book</p>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddBookModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700"
                >
                  Add Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
