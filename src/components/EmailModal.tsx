import React, { useMemo, useState } from 'react';
import { Mail, Send, Users, FileText, X, Download } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { Project, BudgetEntry } from '../types';
import { formatMYR } from '../utils/currency';
import { formatDate } from '../utils/date';
import { validateEmail } from '../utils/validation';

interface EmailModalProps {
  project?: Project;
  budgetEntries?: BudgetEntry[];
  onClose: () => void;
}

const EmailModal: React.FC<EmailModalProps> = ({ project, budgetEntries, onClose }) => {
  const { users } = useApp();
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    to: [] as string[],
    subject: project ? `Project Update: ${project.name}` : 'Budget Report',
    message: '',
    includeProjectDetails: true,
    includeBudgetSummary: true,
    includeTransactions: true,
  });
  const [isSending, setIsSending] = useState(false);
  const [emailMethod, setEmailMethod] = useState<'browser' | 'supabase'>('browser');
  const [manualEmail, setManualEmail] = useState('');
  const [manualRecipients, setManualRecipients] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [recipientError, setRecipientError] = useState<string | null>(null);

  const allUsers = users;
  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [userSearch, allUsers]);

  const handleUserToggle = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      to: prev.to.includes(userId) ? prev.to.filter(id => id !== userId) : [...prev.to, userId]
    }));
  };

  const handleSend = async () => {
    setIsSending(true);
    try {
      const emailContent = generateEmailContent();
      const selectedEmails = formData.to.map(id => users.find(u => u.id === id)?.email).filter(Boolean) as string[];
      const recipients = Array.from(new Set([...selectedEmails, ...manualRecipients]));
      if (recipients.length === 0) {
        setRecipientError('Please add at least one valid recipient');
        setIsSending(false);
        return;
      }

      if (emailMethod === 'browser') {
        // Use browser's mailto functionality
        const mailtoLink = generateMailtoLink(recipients, formData.subject, emailContent);
        window.open(mailtoLink, '_blank');
        
        // Create notifications for team members
        for (const userId of formData.to) {
          try {
            // This will work if you have Supabase configured
            const { supabase } = await import('../lib/supabase');
            await supabase.from('notifications').insert({
              user_id: userId,
              type: 'email_sent',
              title: 'New Email Report',
              message: `${currentUser?.name} sent you a report: ${formData.subject}`,
              data: {
                sender: currentUser?.id,
                subject: formData.subject,
                projectId: project?.id
              },
              read: false
            });
          } catch (error) {
            console.log('Notification creation failed (expected if no Supabase):', error);
          }
        }
        
        alert('Email client opened! Please send the email manually.');
      } else {
        // Try Supabase function
        const { supabase } = await import('../lib/supabase');
        const { error } = await supabase.functions.invoke('send-email', {
          body: {
            to: recipients,
            subject: formData.subject,
            content: emailContent,
            from: currentUser?.email,
            projectId: project?.id
          }
        });

        if (error) throw error;

        // Create notifications
        for (const userId of formData.to) {
          await supabase.from('notifications').insert({
            user_id: userId,
            type: 'email_sent',
            title: 'New Email Report',
            message: `${currentUser?.name} sent you a report: ${formData.subject}`,
            data: {
              sender: currentUser?.id,
              subject: formData.subject,
              projectId: project?.id
            },
            read: false
          });
        }

        alert('Email sent successfully!');
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to send email:', error);
      alert('Failed to send email. Please try again or use the browser method.');
      // Fallback to browser method
      setEmailMethod('browser');
    } finally {
      setIsSending(false);
    }
  };

  const generateMailtoLink = (recipients: string[], subject: string, content: string) => {
    // mailto format: mailto:recipient1,recipient2?subject=...&body=...
    const params = new URLSearchParams({
      subject: subject,
      body: content
    });
    return `mailto:${recipients.join(',')}?${params.toString()}`;
  };

  const addManualRecipient = () => {
    const email = manualEmail.trim();
    if (!email) return;
    if (!validateEmail(email)) {
      setRecipientError('Invalid email address');
      return;
    }
    setRecipientError(null);
    setManualRecipients(prev => (prev.includes(email) ? prev : [...prev, email]));
    setManualEmail('');
  };

  const removeManualRecipient = (email: string) => {
    setManualRecipients(prev => prev.filter(e => e !== email));
  };

  const generateEmailContent = () => {
    let content = formData.message + '\n\n';

    if (project && formData.includeProjectDetails) {
      content += `PROJECT DETAILS:\n`;
      content += `Name: ${project.name}\n`;
      content += `Status: ${project.status.replace('_', ' ').toUpperCase()}\n`;
      content += `Priority: ${project.priority.toUpperCase()}\n`;
      content += `Budget: ${formatMYR(project.budget)}\n`;
      content += `Spent: ${formatMYR(project.spent)}\n`;
      content += `Remaining: ${formatMYR(project.budget - project.spent)}\n\n`;
    }

    if (budgetEntries && formData.includeTransactions && budgetEntries.length > 0) {
      content += `RECENT TRANSACTIONS:\n`;
      budgetEntries.slice(0, 10).forEach(entry => {
        content += `- ${formatDate(entry.date, 'DD/MM/YYYY')}: ${entry.description} - ${formatMYR(entry.amount)} (${entry.type})\n`;
      });
      content += '\n';
    }

    if (formData.includeBudgetSummary && budgetEntries) {
      const totalExpenses = budgetEntries
        .filter(e => e.type === 'expense')
        .reduce((sum, e) => sum + e.amount, 0);
      const totalIncome = budgetEntries
        .filter(e => e.type === 'income')
        .reduce((sum, e) => sum + e.amount, 0);

      content += `BUDGET SUMMARY:\n`;
      content += `Total Expenses: ${formatMYR(totalExpenses)}\n`;
      content += `Total Income: ${formatMYR(totalIncome)}\n`;
      content += `Net: ${formatMYR(totalIncome - totalExpenses)}\n\n`;
    }

    content += `Best regards,\n${currentUser?.name}\nPCR Tracker`;
    return content;
  };

  const downloadEmailContent = () => {
    const content = generateEmailContent();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-report-${project?.name || 'budget'}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Send Email Report
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Email Method Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Method
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="browser"
                  checked={emailMethod === 'browser'}
                  onChange={(e) => setEmailMethod(e.target.value as 'browser' | 'supabase')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Browser Email Client (Opens your default email app)
                </span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="supabase"
                  checked={emailMethod === 'supabase'}
                  onChange={(e) => setEmailMethod(e.target.value as 'browser' | 'supabase')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Direct Send (Requires Supabase Edge Function)
                </span>
              </label>
            </div>
          </div>

          {/* Recipients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Users className="inline h-4 w-4 mr-1" />
              Recipients
            </label>
            <div className="space-y-3">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                placeholder="Search users by name or email"
              />
              <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map(user => (
                  <label key={user.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <input
                      type="checkbox"
                      checked={formData.to.includes(user.id)}
                      onChange={() => handleUserToggle(user.id)}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>
                  </label>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="p-3 text-xs text-gray-500 dark:text-gray-400">No users found</div>
                )}
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <input
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addManualRecipient(); } }}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Type email and press Enter"
                  />
                  <button type="button" onClick={addManualRecipient} className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add</button>
                </div>
                {recipientError && (
                  <p className="mt-1 text-xs text-red-600">{recipientError}</p>
                )}
                {manualRecipients.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {manualRecipients.map(email => (
                      <span key={email} className="inline-flex items-center space-x-1 px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        <span>{email}</span>
                        <button type="button" className="text-gray-500 hover:text-red-600" onClick={() => removeManualRecipient(email)}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Subject
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FileText className="inline h-4 w-4 mr-1" />
              Message
            </label>
            <textarea
              rows={4}
              value={formData.message}
              onChange={e => setFormData(prev => ({ ...prev, message: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter your message..."
            />
          </div>

          {/* Options */}
          <div className="space-y-3">
            {project && (
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.includeProjectDetails}
                  onChange={e => setFormData(prev => ({ ...prev, includeProjectDetails: e.target.checked }))}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Include project details
                </span>
              </label>
            )}
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.includeBudgetSummary}
                onChange={e => setFormData(prev => ({ ...prev, includeBudgetSummary: e.target.checked }))}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Include budget summary
              </span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.includeTransactions}
                onChange={e => setFormData(prev => ({ ...prev, includeTransactions: e.target.checked }))}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Include recent transactions
              </span>
            </label>
          </div>

          {/* Preview */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
              Email Preview
            </h4>
            <div className="space-y-2 text-sm text-blue-800 dark:text-blue-400">
              <p>To: {formData.to.length + manualRecipients.length} recipient(s)</p>
              <p>Subject: {formData.subject}</p>
              <div className="border-t border-blue-200 dark:border-blue-700 mt-2 pt-2">
                <p className="font-medium">Content will include:</p>
                <ul className="mt-1 space-y-1">
                  {formData.includeProjectDetails && project && (
                    <li>• Project details and status</li>
                  )}
                  {formData.includeBudgetSummary && (
                    <li>• Budget summary and analysis</li>
                  )}
                  {formData.includeTransactions && (
                    <li>• Recent transactions (up to 10)</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={downloadEmailContent}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Download Content</span>
          </button>
          
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={isSending || (formData.to.length === 0 && manualRecipients.length === 0) || !!recipientError}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span>{isSending ? 'Sending...' : emailMethod === 'browser' ? 'Open Email Client' : 'Send Email'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailModal;