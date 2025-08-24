import { supabase } from '../lib/supabase';
import React, { useMemo, useState, useEffect } from 'react';
import { FileSpreadsheet, Download, Upload, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import type { Project, BudgetEntry, BudgetCode } from '../types';
import { initGoogleAPI, getStoredGoogleToken, setGoogleToken, clearStoredGoogleToken, handleGoogleCallback } from '../lib/googleAuth';

const GoogleSheetsIntegration: React.FC = () => {
  const { projects, budgetEntries, budgetCodes, users, units } = useApp();
  const [isConnected, setIsConnected] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [googleToken, setGoogleToken] = useState<string | null>(null);

  // Import states
  const [projectsFile, setProjectsFile] = useState<File | null>(null);
  const [entriesFile, setEntriesFile] = useState<File | null>(null);
  const [codesFile, setCodesFile] = useState<File | null>(null);

  // Initialize Google API and check for existing tokens on mount
  useEffect(() => {
    const initializeGoogle = async () => {
      try {
        // Initialize Google API
        const apiInitialized = await initGoogleAPI();
        if (!apiInitialized) {
          console.error('[Sheets] Failed to initialize Google API');
          return;
        }

        // Check for stored Google token
        const storedToken = getStoredGoogleToken();
        if (storedToken) {
          setGoogleToken(storedToken);
          setGoogleToken(storedToken); // Set for gapi client
          setIsConnected(true);
          console.log('[Sheets Connected]', { 
            scope: 'stored_token',
            redirect: window.location.origin 
          });
        } else {
          // Fallback: check Supabase session for provider_token
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.provider_token) {
            setGoogleToken(session.provider_token);
            setGoogleToken(session.provider_token); // Set for gapi client
            setIsConnected(true);
            console.log('[Sheets Connected]', { 
              scope: session.provider_refresh_token ? 'refresh_token_available' : 'token_only',
              redirect: window.location.origin 
            });
          }
        }
      } catch (error) {
        console.error('[Sheets Auth Check Error]', error);
      }
    };
    
    initializeGoogle();
  }, []);

  // Handle OAuth callback when component mounts
  useEffect(() => {
    handleOAuthCallback();
  }, []);

  // Helper function to print current scopes/token expiry
  const printTokenInfo = async () => {
    try {
      const storedToken = getStoredGoogleToken();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (storedToken || session?.provider_token) {
        console.log('[Sheets Token Info]', {
          hasStoredToken: !!storedToken,
          hasProviderToken: !!session?.provider_token,
          hasRefreshToken: !!session?.provider_refresh_token,
          expiresAt: session?.expires_at,
          provider: session?.user?.app_metadata?.provider,
          scopes: 'spreadsheets + drive.file'
        });
      } else {
        console.log('[Sheets Token Info] No Google OAuth token found');
      }
    } catch (error) {
      console.error('[Sheets Token Info Error]', error);
    }
  };

  // Handle OAuth callback when returning from Google
  const handleOAuthCallback = async () => {
    if (window.location.pathname === '/auth/callback/google') {
      try {
        console.log('[Sheets] Handling OAuth callback...');
        const token = await handleGoogleCallback();
        if (token) {
          setGoogleToken(token);
          setIsConnected(true);
          console.log('[Sheets] OAuth callback successful, token captured');
          // Redirect back to main page
          window.history.replaceState({}, '', '/');
        }
      } catch (error) {
        console.error('[Sheets] OAuth callback failed:', error);
      }
    }
  };

  type ValidationIssue = { row: number; field?: string; message: string };
  type ImportPreview<T> = {
    items: T[];
    issues: ValidationIssue[];
    validCount: number;
    invalidCount: number;
  };

  const [projectsPreview, setProjectsPreview] = useState<ImportPreview<Project> | null>(null);
  const [entriesPreview, setEntriesPreview] = useState<ImportPreview<BudgetEntry> | null>(null);
  const [codesPreview, setCodesPreview] = useState<ImportPreview<BudgetCode> | null>(null);
  const [preparedData, setPreparedData] = useState<
    { projects: Project[]; budgetEntries: BudgetEntry[]; budgetCodes: BudgetCode[] } | null
  >(null);

  const existingProjectNameToId = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach(p => map.set(p.name.trim().toLowerCase(), p.id));
    return map;
  }, [projects]);

  const existingBudgetCodeToId = useMemo(() => {
    const map = new Map<string, string>();
    budgetCodes.forEach(b => map.set(b.code.trim().toLowerCase(), b.id));
    return map;
  }, [budgetCodes]);

  const generateId = () => (typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : Math.random().toString(36).slice(2));

  const toYMD = (value: string): string | null => {
    if (!value) return null;
    // Accept YYYY-MM-DD directly
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    if (iso.test(value)) return value;
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const toNumber = (value: string): number | null => {
    if (value === undefined || value === null) return null;
    const cleaned = String(value).replace(/[,\s]/g, '');
    const n = Number(cleaned);
    return isNaN(n) ? null : n;
  };

  // Minimal CSV parser with quoted field support
  const parseCSV = async (file: File): Promise<{ headers: string[]; rows: string[][] }> => {
    const text = await file.text();
    const rows: string[][] = [];
    let i = 0;
    let field = '';
    let row: string[] = [];
    let inQuotes = false;
    const pushField = () => { row.push(field); field = ''; };
    const pushRow = () => { rows.push(row); row = []; };
    while (i < text.length) {
      const char = text[i];
      if (inQuotes) {
        if (char === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        field += char; i++; continue;
      }
      if (char === '"') { inQuotes = true; i++; continue; }
      if (char === ',') { pushField(); i++; continue; }
      if (char === '\n') { pushField(); pushRow(); i++; continue; }
      if (char === '\r') { i++; continue; }
      field += char; i++;
    }
    // Flush last field/row
    pushField();
    if (row.length > 1 || (row.length === 1 && row[0] !== '')) pushRow();
    if (rows.length === 0) return { headers: [], rows: [] };
    const headers = rows.shift() as string[];
    return { headers, rows };
  };

  // Header constants
  const PROJECT_HEADERS = ['Project Name', 'Status', 'Priority', 'Start Date', 'End Date', 'Budget,', 'Spent', 'Remaining'].map(h => h.replace(/,$/, ''));
  const ENTRY_HEADERS = ['Date', 'Project', 'Budget Code', 'Description', 'Category', 'Type', 'Amount'];
  const CODE_HEADERS = ['Code', 'Name', 'Description', 'Budget', 'Spent', 'Remaining', 'Status'];

  const validateHeaders = (actual: string[], expected: string[]) => {
    return expected.every((h, idx) => (actual[idx] || '').trim() === h);
  };

  const downloadTemplate = (headers: string[], filename: string) => {
    downloadCSV([headers], filename);
  };

  const handleProjectsFile = async (file: File) => {
    setProjectsFile(file);
    const { headers, rows } = await parseCSV(file);
    const issues: ValidationIssue[] = [];
    if (!validateHeaders(headers, PROJECT_HEADERS)) {
      issues.push({ row: 0, message: 'Invalid Projects CSV headers. Please use the provided template.' });
      setProjectsPreview({ items: [], issues, validCount: 0, invalidCount: rows.length });
      return;
    }
    const items: Project[] = [];
    const nameToId = new Map(existingProjectNameToId);
    rows.forEach((r, idx) => {
      const rowNum = idx + 2; // 1-based with header
      const [name, statusRaw, priorityRaw, startRaw, endRaw, budgetRaw, spentRaw] = [
        r[0]?.trim(), r[1]?.trim(), r[2]?.trim(), r[3]?.trim(), r[4]?.trim(), r[5]?.trim(), r[6]?.trim()
      ];
      if (!name) issues.push({ row: rowNum, field: 'Project Name', message: 'Required' });
      if (!statusRaw || !['planning', 'active', 'on_hold', 'completed', 'cancelled'].includes(statusRaw)) {
        issues.push({ row: rowNum, field: 'Status', message: 'Invalid status' });
      }
      if (!priorityRaw || !['low', 'medium', 'high'].includes(priorityRaw)) {
        issues.push({ row: rowNum, field: 'Priority', message: 'Invalid priority' });
      }
      const startDate = toYMD(startRaw || '');
      if (!startDate) issues.push({ row: rowNum, field: 'Start Date', message: 'Invalid date' });
      const endDate = toYMD(endRaw || '');
      if (!endDate) issues.push({ row: rowNum, field: 'End Date', message: 'Invalid date' });
      const budget = toNumber(budgetRaw ?? '');
      if (budget === null) issues.push({ row: rowNum, field: 'Budget', message: 'Invalid number' });
      const spent = toNumber(spentRaw ?? '0') ?? 0;

      const id = name ? (nameToId.get(name.toLowerCase()) || generateId()) : generateId();
      if (name) nameToId.set(name.toLowerCase(), id);

      const now = new Date().toISOString();
      // Use first available unit or generate placeholder
      const defaultUnitId = units.length > 0 ? units[0].id : 'default-unit';
      items.push({
        id,
        name: name || '',
        description: '',
        unitId: defaultUnitId,
        status: (statusRaw as Project['status']) || 'planning',
        priority: (priorityRaw as Project['priority']) || 'low',
        startDate: startDate || now.slice(0, 10),
        endDate: endDate || now.slice(0, 10),
        budget: budget ?? 0,
        spent,
        assignedUsers: [],
        budgetCodes: [],
        createdBy: 'import',
        createdAt: now,
        updatedAt: now,
      });
    });
    const invalidRows = new Set(issues.map(i => i.row));
    setProjectsPreview({ items, issues, validCount: rows.length - invalidRows.size, invalidCount: invalidRows.size });
  };

  const handleCodesFile = async (file: File) => {
    setCodesFile(file);
    const { headers, rows } = await parseCSV(file);
    const issues: ValidationIssue[] = [];
    if (!validateHeaders(headers, CODE_HEADERS)) {
      issues.push({ row: 0, message: 'Invalid Budget Codes CSV headers. Please use the provided template.' });
      setCodesPreview({ items: [], issues, validCount: 0, invalidCount: rows.length });
      return;
    }
    const items: BudgetCode[] = [];
    const codeToId = new Map(existingBudgetCodeToId);
    rows.forEach((r, idx) => {
      const rowNum = idx + 2;
      const [code, name, description, budgetRaw, spentRaw, _remaining, statusRaw] = [
        r[0]?.trim(), r[1]?.trim(), r[2]?.trim(), r[3]?.trim(), r[4]?.trim(), r[5]?.trim(), r[6]?.trim()
      ];
      if (!code) issues.push({ row: rowNum, field: 'Code', message: 'Required' });
      if (!name) issues.push({ row: rowNum, field: 'Name', message: 'Required' });
      const budget = toNumber(budgetRaw ?? '');
      if (budget === null) issues.push({ row: rowNum, field: 'Budget', message: 'Invalid number' });
      const spent = toNumber(spentRaw ?? '0') ?? 0;
      const isActive = (statusRaw || '').toLowerCase() === 'active';
      const id = code ? (codeToId.get(code.toLowerCase()) || generateId()) : generateId();
      if (code) codeToId.set(code.toLowerCase(), id);
      const now = new Date().toISOString();
      items.push({
        id,
        code: code || '',
        name: name || '',
        description: description || '',
        budget: budget ?? 0,
        spent,
        isActive,
        createdBy: 'import',
        createdAt: now,
        updatedAt: now,
      });
    });
    const invalidRows = new Set(issues.map(i => i.row));
    setCodesPreview({ items, issues, validCount: rows.length - invalidRows.size, invalidCount: invalidRows.size });
  };

  const handleEntriesFile = async (file: File) => {
    setEntriesFile(file);
    const { headers, rows } = await parseCSV(file);
    const issues: ValidationIssue[] = [];
    if (!validateHeaders(headers, ENTRY_HEADERS)) {
      issues.push({ row: 0, message: 'Invalid Budget Entries CSV headers. Please use the provided template.' });
      setEntriesPreview({ items: [], issues, validCount: 0, invalidCount: rows.length });
      return;
    }
    const items: BudgetEntry[] = [];
    // Build lookup maps including imported previews (if present)
    const projectNameToId = new Map(existingProjectNameToId);
    projectsPreview?.items.forEach(p => projectNameToId.set(p.name.trim().toLowerCase(), p.id));
    const codeToId = new Map(existingBudgetCodeToId);
    codesPreview?.items.forEach(c => codeToId.set(c.code.trim().toLowerCase(), c.id));

    rows.forEach((r, idx) => {
      const rowNum = idx + 2;
      const [dateRaw, projectName, codeRaw, description, category, typeRaw, amountRaw] = [
        r[0]?.trim(), r[1]?.trim(), r[2]?.trim(), r[3]?.trim(), r[4]?.trim(), r[5]?.trim(), r[6]?.trim()
      ];
      const date = toYMD(dateRaw || '');
      if (!date) issues.push({ row: rowNum, field: 'Date', message: 'Invalid date' });
      if (!projectName) {
        issues.push({ row: rowNum, field: 'Project', message: 'Required' });
      }
      const amount = toNumber(amountRaw ?? '');
      if (amount === null) issues.push({ row: rowNum, field: 'Amount', message: 'Invalid number' });
      if (!typeRaw || !['expense', 'income'].includes(typeRaw)) {
        issues.push({ row: rowNum, field: 'Type', message: 'Invalid type' });
      }
      const projectId = projectName ? projectNameToId.get(projectName.toLowerCase()) : undefined;
      if (!projectId) issues.push({ row: rowNum, field: 'Project', message: 'Unknown project name' });
      const budgetCodeId = codeRaw ? codeToId.get(codeRaw.toLowerCase()) : undefined; // optional
      const now = new Date().toISOString();
      items.push({
        id: generateId(),
        projectId: projectId || '',
        budgetCodeId,
        description: description || '',
        amount: amount ?? 0,
        type: (typeRaw as BudgetEntry['type']) || 'expense',
        category: category || '',
        date: date || now.slice(0, 10),
        createdBy: 'import',
        createdAt: now,
      });
    });
    const invalidRows = new Set(issues.map(i => i.row));
    setEntriesPreview({ items, issues, validCount: rows.length - invalidRows.size, invalidCount: invalidRows.size });
  };

  const handleConfirmImport = () => {
    const projectsItems = projectsPreview?.items || [];
    const codesItems = codesPreview?.items || [];
    const entriesItems = entriesPreview?.items || [];
    setPreparedData({ projects: projectsItems, budgetEntries: entriesItems, budgetCodes: codesItems });
    alert('Import prepared. Review the preview and use the prepared payload for applying changes.');
  };

  const handleConnect = async () => {
    try {
      console.log('[Sheets Connect] Starting OAuth flow...');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
          redirectTo: window.location.origin + '/auth/callback/google',
          queryParams: {
            prompt: 'consent',
            access_type: 'offline'
          }
        },
      });

      if (error) {
        console.error('[Sheets Connect Error]', error);
        throw error;
      }
      
      console.log('[Sheets Connect] OAuth flow initiated successfully');
    } catch (error: any) {
      console.error('[Sheets Connect Error]', error);
      alert(`Error connecting: ${error.message}`);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      console.log('[Sheets Export] Starting export process...');
      
      if (!googleToken) {
        throw new Error('No Google OAuth token available');
      }

      // Set token for gapi client
      setGoogleToken(googleToken);

      // Test Sheets API access with gapi.client
      try {
        const response = await window.gapi.client.sheets.spreadsheets.get({
          spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
        });
        
        console.log('[Sheets Export] API access verified successfully');
        
        // Test actual Sheets API call (minimal sample)
        try {
          const testResponse = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
            range: 'A1:C1'
          });
          
          if (testResponse.status === 200) {
            console.log('[Sheets API Test] Successfully accessed sample spreadsheet data');
          } else {
            console.warn('[Sheets API Test] Sample call failed (expected for demo spreadsheet):', testResponse.status);
          }
        } catch (testError: any) {
          console.warn('[Sheets API Test] Sample call error (expected for demo spreadsheet):', testError);
        }
        
      } catch (apiError: any) {
        console.error('[Sheets API Error]', apiError);
        throw new Error(`Failed to access Google Sheets API: ${apiError.message || 'Unknown error'}`);
      }
      
      // Check if we have a spreadsheet ID
      if (!sheetUrl) {
        throw new Error('Please create or specify a spreadsheet ID first');
      }
      
      // Extract spreadsheet ID from URL
      const sheetId = sheetUrl.includes('spreadsheets/d/') 
        ? sheetUrl.split('spreadsheets/d/')[1].split('/')[0]
        : sheetUrl;
      
      // Write test data to A1:C1
      const testData = [['Project', 'Owner', 'Status']];
      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: 'A1:C1',
        valueInputOption: 'RAW',
        resource: { values: testData }
      });
      
      console.log('[Sheets update OK] Test data written to A1:C1');
      
      // Export actual data
      const projectsData = [
        ['Project Name', 'Status', 'Priority', 'Start Date', 'End Date', 'Budget', 'Spent', 'Remaining'],
        ...projects.map(project => [
          project.name,
          project.status,
          project.priority,
          project.startDate,
          project.endDate,
          project.budget.toString(),
          project.spent.toString(),
          (project.budget - project.spent).toString()
        ])
      ];
      
      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: 'A3',
        valueInputOption: 'RAW',
        resource: { values: projectsData }
      });
      
      console.log('[Sheets update OK] Projects exported successfully');
      
      alert('Data exported to Google Sheets successfully!');
    } catch (error: any) {
      console.error('[Sheets Export Error]', error);
      alert(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      // Parse selected files in sequence
      if (projectsFile) await handleProjectsFile(projectsFile);
      if (codesFile) await handleCodesFile(codesFile);
      if (entriesFile) await handleEntriesFile(entriesFile);
    } finally {
      setIsImporting(false);
    }
  };

  const generateCSVData = () => {
    // Projects CSV
    const projectsCSV = [
      ['Project Name', 'Status', 'Priority', 'Start Date', 'End Date', 'Budget', 'Spent', 'Remaining'],
      ...projects.map(project => [
        project.name,
        project.status,
        project.priority,
        project.startDate,
        project.endDate,
        project.budget,
        project.spent,
        project.budget - project.spent
      ])
    ];

    // Budget Entries CSV
    const entriesCSV = [
      ['Date', 'Project', 'Budget Code', 'Description', 'Category', 'Type', 'Amount'],
      ...budgetEntries.map(entry => {
        const project = projects.find(p => p.id === entry.projectId);
        const budgetCode = budgetCodes.find(bc => bc.id === entry.budgetCodeId);
        return [
          entry.date,
          project?.name || 'Unknown',
          budgetCode?.code || 'No Code',
          entry.description,
          entry.category,
          entry.type,
          entry.amount
        ];
      })
    ];

    // Budget Codes CSV
    const codesCSV = [
      ['Code', 'Name', 'Description', 'Budget', 'Spent', 'Remaining', 'Status'],
      ...budgetCodes.map(code => [
        code.code,
        code.name,
        code.description,
        code.budget,
        code.spent,
        code.budget - code.spent,
        code.isActive ? 'Active' : 'Inactive'
      ])
    ];

    return { projectsCSV, entriesCSV, codesCSV };
  };

  const downloadCSV = (data: any[][], filename: string) => {
    const csvContent = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const { projectsCSV, entriesCSV, codesCSV } = generateCSVData();

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <FileSpreadsheet className="h-6 w-6 text-green-600 dark:text-green-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Google Sheets Integration
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            )}
            <span className={`text-sm font-medium ${
              isConnected 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-yellow-600 dark:text-yellow-400'
            }`}>
              {isConnected ? 'Connected' : 'Not Connected'}
            </span>
          </div>
        </div>

        {!isConnected ? (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Connect to Google Sheets to sync your project data automatically.
            </p>
            <button
              onClick={handleConnect}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Connect to Google Sheets</span>
            </button>
            <button
              onClick={() => {
                clearStoredGoogleToken();
                setGoogleToken(null);
                setIsConnected(false);
                setSheetUrl('');
                console.log('[Sheets] Disconnected and cleared tokens');
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <span>Disconnect</span>
            </button>
            {import.meta.env.DEV && (
              <button
                onClick={printTokenInfo}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Debug: Check Token Status
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Your data is connected to Google Sheets. You can export new data or import updates.
            </p>
            
            {/* Spreadsheet ID Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Google Spreadsheet ID
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Enter spreadsheet ID or leave empty to create new"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                />
                <button
                  onClick={async () => {
                    try {
                      if (!googleToken) throw new Error('No token available');
                      setGoogleToken(googleToken);
                      
                      // Create new spreadsheet
                      const response = await window.gapi.client.sheets.spreadsheets.create({
                        properties: {
                          title: 'PCR Tracker Export'
                        }
                      });
                      
                      if (response.status === 200) {
                        const newSheetId = response.result.spreadsheetId;
                        const newSheetUrl = `https://docs.google.com/spreadsheets/d/${newSheetId}`;
                        setSheetUrl(newSheetUrl);
                        console.log('[Sheets] Created new spreadsheet:', newSheetId);
                      }
                    } catch (error) {
                      console.error('[Sheets] Create sheet error:', error);
                      alert('Failed to create spreadsheet. Please check console for details.');
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  Create New
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Leave empty to create a new spreadsheet, or paste an existing spreadsheet ID
              </p>
            </div>
            
            {import.meta.env.DEV && (
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <div>Token: {googleToken ? '✅ Available' : '❌ Missing'}</div>
                <div>Redirect: {window.location.origin}/auth/callback/google</div>
                <div>Scopes: spreadsheets + drive.file</div>
              </div>
            )}
            {sheetUrl && (
              <a
                href={sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:underline"
              >
                <span>View Google Sheet</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Export/Import Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Export Data</h4>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Export your current project data to Google Sheets or download as CSV files.
          </p>
          <div className="space-y-3">
            <button
              onClick={handleExport}
              disabled={isExporting || !isConnected}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isExporting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span>{isExporting ? 'Exporting...' : 'Export to Google Sheets'}</span>
            </button>
            
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">or</div>
            
            <div className="space-y-2">
              <button
                onClick={() => downloadCSV(projectsCSV, 'projects.csv')}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Download Projects CSV</span>
              </button>
              <button
                onClick={() => downloadCSV(entriesCSV, 'budget-entries.csv')}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Download Budget Entries CSV</span>
              </button>
              <button
                onClick={() => downloadCSV(codesCSV, 'budget-codes.csv')}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Download Budget Codes CSV</span>
              </button>
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => downloadTemplate(PROJECT_HEADERS, 'projects_template.csv')}
                  className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Projects Template</span>
                </button>
                <button
                  onClick={() => downloadTemplate(ENTRY_HEADERS, 'budget_entries_template.csv')}
                  className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Entries Template</span>
                </button>
                <button
                  onClick={() => downloadTemplate(CODE_HEADERS, 'budget_codes_template.csv')}
                  className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Codes Template</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Import */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Download className="h-5 w-5 text-green-600 dark:text-green-400" />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Import Data</h4>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Import updated data from CSV files exported from Google Sheets.
          </p>
          <div className="space-y-3 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="block">
                <span className="text-sm text-gray-700 dark:text-gray-300">Projects CSV</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && handleProjectsFile(e.target.files[0])}
                  className="mt-1 block w-full text-sm text-gray-600 dark:text-gray-300"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-700 dark:text-gray-300">Budget Entries CSV</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && handleEntriesFile(e.target.files[0])}
                  className="mt-1 block w-full text-sm text-gray-600 dark:text-gray-300"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-700 dark:text-gray-300">Budget Codes CSV</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && handleCodesFile(e.target.files[0])}
                  className="mt-1 block w-full text-sm text-gray-600 dark:text-gray-300"
                />
              </label>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleImport}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {isImporting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span>{isImporting ? 'Parsing...' : 'Parse Selected CSVs'}</span>
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={
                  !projectsPreview && !entriesPreview && !codesPreview
                }
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Confirm Import</span>
              </button>
            </div>
          </div>

          {/* Preview & Validation Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="font-semibold mb-2 text-gray-900 dark:text-white">Projects</div>
              <div className="text-sm text-gray-700 dark:text-gray-300">Valid: {projectsPreview?.validCount ?? 0}</div>
              <div className="text-sm text-gray-700 dark:text-gray-300">Invalid: {projectsPreview?.invalidCount ?? 0}</div>
              {projectsPreview?.issues?.length ? (
                <details className="mt-2">
                  <summary className="text-sm text-red-600 cursor-pointer">View issues ({projectsPreview.issues.length})</summary>
                  <ul className="mt-2 max-h-32 overflow-auto text-xs text-red-600 space-y-1">
                    {projectsPreview.issues.map((i, idx) => (
                      <li key={idx}>Row {i.row}{i.field ? ` - ${i.field}` : ''}: {i.message}</li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="font-semibold mb-2 text-gray-900 dark:text-white">Budget Entries</div>
              <div className="text-sm text-gray-700 dark:text-gray-300">Valid: {entriesPreview?.validCount ?? 0}</div>
              <div className="text-sm text-gray-700 dark:text-gray-300">Invalid: {entriesPreview?.invalidCount ?? 0}</div>
              {entriesPreview?.issues?.length ? (
                <details className="mt-2">
                  <summary className="text-sm text-red-600 cursor-pointer">View issues ({entriesPreview.issues.length})</summary>
                  <ul className="mt-2 max-h-32 overflow-auto text-xs text-red-600 space-y-1">
                    {entriesPreview.issues.map((i, idx) => (
                      <li key={idx}>Row {i.row}{i.field ? ` - ${i.field}` : ''}: {i.message}</li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="font-semibold mb-2 text-gray-900 dark:text-white">Budget Codes</div>
              <div className="text-sm text-gray-700 dark:text-gray-300">Valid: {codesPreview?.validCount ?? 0}</div>
              <div className="text-sm text-gray-700 dark:text-gray-300">Invalid: {codesPreview?.invalidCount ?? 0}</div>
              {codesPreview?.issues?.length ? (
                <details className="mt-2">
                  <summary className="text-sm text-red-600 cursor-pointer">View issues ({codesPreview.issues.length})</summary>
                  <ul className="mt-2 max-h-32 overflow-auto text-xs text-red-600 space-y-1">
                    {codesPreview.issues.map((i, idx) => (
                      <li key={idx}>Row {i.row}{i.field ? ` - ${i.field}` : ''}: {i.message}</li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          </div>

          {preparedData ? (
            <div className="mt-4 p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-sm text-blue-900 dark:text-blue-300">
              Prepared payload ready. Projects: {preparedData.projects.length}, Entries: {preparedData.budgetEntries.length}, Codes: {preparedData.budgetCodes.length}
            </div>
          ) : null}
        </div>
      </div>

      {/* Data Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Data Summary
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {projects.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Projects</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {budgetEntries.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Budget Entries</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {budgetCodes.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Budget Codes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {users.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Users</div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-3">
          How to Use Google Sheets Integration
        </h4>
        <div className="space-y-2 text-sm text-blue-800 dark:text-blue-400">
          <p>1. <strong>Connect:</strong> Click "Connect to Google Sheets" to authorize access</p>
          <p>2. <strong>Export:</strong> Send your current data to a new Google Sheet</p>
          <p>3. <strong>Edit:</strong> Make changes directly in Google Sheets</p>
          <p>4. <strong>Import:</strong> Sync changes back to the application</p>
          <p>5. <strong>Collaborate:</strong> Share the sheet with team members for real-time collaboration</p>
        </div>
      </div>
    </div>
  );
};

export default GoogleSheetsIntegration;