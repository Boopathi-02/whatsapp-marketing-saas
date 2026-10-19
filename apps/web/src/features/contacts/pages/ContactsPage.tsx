import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
  Paper,
} from '@mui/material';

import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { PageHeader } from '../../../components/common/PageHeader.js';
import { EmptyState } from '../../../components/common/EmptyState.js';
import { useOptionalAuth } from '../../auth/AuthContext.js';
import { api, ApiClientError } from '../../../lib/api.js';
import {
  ContactDto,
  PaginatedContactsResponse,
  ImportContactsResult,
  ContactOptInStatus,
} from '@whatsapp-saas/contracts';


export const ContactsPage: React.FC = () => {
  const auth = useOptionalAuth();
  const currentWorkspace = auth?.currentWorkspace;

  // Contact list state
  const [contacts, setContacts] = useState<ContactDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Pagination & Filtering state
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [totalContacts, setTotalContacts] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedConsent, setSelectedConsent] = useState<string>('ALL');
  const [suppressedFilter, setSuppressedFilter] = useState<string>('ALL');

  // Add/Edit Dialog State
  const [contactDialogOpen, setContactDialogOpen] = useState<boolean>(false);
  const [editingContact, setEditingContact] = useState<ContactDto | null>(null);
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [nameInput, setNameInput] = useState<string>('');
  const [emailInput, setEmailInput] = useState<string>('');
  const [tagsInput, setTagsInput] = useState<string>('');
  const [consentInput, setConsentInput] = useState<ContactOptInStatus>(ContactOptInStatus.PENDING);
  const [consentSourceInput, setConsentSourceInput] = useState<string>('manual_entry');
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // CSV Import Dialog State
  const [importDialogOpen, setImportDialogOpen] = useState<boolean>(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<ImportContactsResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Delete & Suppression Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<ContactDto | null>(null);
  const [suppressTarget, setSuppressTarget] = useState<ContactDto | null>(null);
  const [suppressionReason, setSuppressionReason] = useState<string>('User requested opt-out');

  const fetchContacts = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(page + 1));
      params.set('limit', String(rowsPerPage));

      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim());
      }
      if (selectedTag.trim()) {
        params.set('tag', selectedTag.trim());
      }
      if (selectedConsent !== 'ALL') {
        params.set('consentStatus', selectedConsent);
      }
      if (suppressedFilter === 'SUPPRESSED') {
        params.set('isSuppressed', 'true');
      } else if (suppressedFilter === 'ACTIVE') {
        params.set('isSuppressed', 'false');
      }

      const res = await api.get<PaginatedContactsResponse>(
        `/workspaces/${currentWorkspace.id}/contacts?${params.toString()}`
      );

      setContacts(res.contacts);
      setTotalContacts(res.pagination.totalContacts);
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to fetch contacts');
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, page, rowsPerPage, searchTerm, selectedTag, selectedConsent, suppressedFilter]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleOpenAddDialog = () => {
    setEditingContact(null);
    setPhoneInput('');
    setNameInput('');
    setEmailInput('');
    setTagsInput('');
    setConsentInput(ContactOptInStatus.PENDING);
    setConsentSourceInput('manual_entry');
    setFormError(null);
    setContactDialogOpen(true);
  };

  const handleOpenEditDialog = (contact: ContactDto) => {
    setEditingContact(contact);
    setPhoneInput(contact.phoneNumber);
    setNameInput(contact.displayName || '');
    setEmailInput(contact.email || '');
    setTagsInput(contact.tags.join(', '));
    setConsentInput(contact.consentStatus);
    setConsentSourceInput(contact.consentSource || '');
    setFormError(null);
    setContactDialogOpen(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace?.id) return;

    if (!phoneInput.trim()) {
      setFormError('Phone number is required');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    const parsedTags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    try {
      if (editingContact) {
        await api.patch(
          `/workspaces/${currentWorkspace.id}/contacts/${editingContact.id}`,
          {
            displayName: nameInput.trim() || undefined,
            email: emailInput.trim() || undefined,
            tags: parsedTags,
            consentStatus: consentInput,
            consentSource: consentSourceInput.trim() || undefined,
          }
        );
        setSuccess('Contact updated successfully');
      } else {
        await api.post(
          `/workspaces/${currentWorkspace.id}/contacts`,
          {
            phoneNumber: phoneInput.trim(),
            displayName: nameInput.trim() || undefined,
            email: emailInput.trim() || undefined,
            tags: parsedTags,
            consentStatus: consentInput,
            consentSource: consentSourceInput.trim() || 'manual_entry',
          }
        );
        setSuccess('Contact created and normalized to E.164 format successfully');
      }

      setContactDialogOpen(false);
      fetchContacts();
    } catch (err: unknown) {
      setFormError(err instanceof ApiClientError ? err.message : 'Operation failed');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!currentWorkspace?.id || !deleteTarget) return;

    try {
      await api.delete(`/workspaces/${currentWorkspace.id}/contacts/${deleteTarget.id}`);
      setSuccess('Contact removed from directory');
      setDeleteTarget(null);
      fetchContacts();
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to delete contact');
    }
  };

  const handleToggleSuppression = async () => {
    if (!currentWorkspace?.id || !suppressTarget) return;

    try {
      const nextSuppressed = !suppressTarget.isSuppressed;
      await api.post(
        `/workspaces/${currentWorkspace.id}/contacts/${suppressTarget.id}/suppression`,
        {
          isSuppressed: nextSuppressed,
          suppressionReason: nextSuppressed ? suppressionReason : undefined,
        }
      );
      setSuccess(
        nextSuppressed
          ? 'Contact has been suppressed from campaigns.'
          : 'Contact suppression has been lifted.'
      );
      setSuppressTarget(null);
      fetchContacts();
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to update suppression state');
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace?.id || !csvFile) return;

    setImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      const text = await csvFile.text();
      const res = await api.post<ImportContactsResult>(
        `/workspaces/${currentWorkspace.id}/contacts/import`,
        { csvContent: text }
      );

      setImportResult(res);
      setSuccess(`Import processed: ${res.createdCount} created, ${res.updatedCount} updated.`);
      fetchContacts();
    } catch (err: unknown) {
      setImportError(err instanceof ApiClientError ? err.message : 'Failed to import CSV');
    } finally {
      setImporting(false);
    }
  };

  const handleExportCsv = async () => {
    if (!currentWorkspace?.id) return;

    try {
      const params = new URLSearchParams();
      if (selectedTag.trim()) params.set('tag', selectedTag.trim());
      if (selectedConsent !== 'ALL') params.set('consentStatus', selectedConsent);
      if (suppressedFilter === 'SUPPRESSED') params.set('isSuppressed', 'true');
      if (suppressedFilter === 'ACTIVE') params.set('isSuppressed', 'false');

      const blob = await api.downloadBlob(
        `/workspaces/${currentWorkspace.id}/contacts/export?${params.toString()}`
      );

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contacts_${currentWorkspace.slug || 'export'}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setSuccess('Contacts exported to CSV successfully');
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to export CSV');
    }
  };

  const getConsentChip = (status: ContactOptInStatus) => {
    switch (status) {
      case ContactOptInStatus.OPTED_IN:
        return <Chip label="Opted In" size="small" sx={{ bgcolor: '#ECFDF5', color: '#059669', fontWeight: 600 }} />;
      case ContactOptInStatus.OPTED_OUT:
        return <Chip label="Opted Out" size="small" sx={{ bgcolor: '#FEF2F2', color: '#DC2626', fontWeight: 600 }} />;
      default:
        return <Chip label="Pending" size="small" sx={{ bgcolor: '#FFFBEB', color: '#D97706', fontWeight: 600 }} />;
    }
  };

  return (
    <Box id="contacts-page-container" sx={{ pb: 6 }}>
      <PageHeader
        title="Contact Management"
        subtitle="Audience directory, E.164 phone normalization, opt-in consent records, and suppression controls"
        action={
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<DownloadIcon />}
              onClick={handleExportCsv}
            >
              Export CSV
            </Button>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<UploadFileIcon />}
              onClick={() => {
                setCsvFile(null);
                setImportResult(null);
                setImportError(null);
                setImportDialogOpen(true);
              }}
            >
              Import CSV
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpenAddDialog}
              sx={{ fontWeight: 600 }}
            >
              Add Contact
            </Button>
          </Box>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Filter and Search Bar */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Search by phone, name, or email..."
            size="small"
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
            sx={{ flexGrow: 1, minWidth: 260 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            placeholder="Filter by tag..."
            size="small"
            value={selectedTag}
            onChange={e => {
              setSelectedTag(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 160 }}
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Consent</InputLabel>
            <Select
              value={selectedConsent}
              label="Consent"
              onChange={e => {
                setSelectedConsent(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="ALL">All Consent</MenuItem>
              <MenuItem value={ContactOptInStatus.OPTED_IN}>Opted In</MenuItem>
              <MenuItem value={ContactOptInStatus.OPTED_OUT}>Opted Out</MenuItem>
              <MenuItem value={ContactOptInStatus.PENDING}>Pending</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Suppression</InputLabel>
            <Select
              value={suppressedFilter}
              label="Suppression"
              onChange={e => {
                setSuppressedFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="ALL">All Status</MenuItem>
              <MenuItem value="ACTIVE">Active Only</MenuItem>
              <MenuItem value="SUPPRESSED">Suppressed Only</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Contacts Data Table */}
      <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table sx={{ minWidth: 750 }}>
            <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>PHONE NUMBER (E.164)</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>NAME</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>EMAIL</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>TAGS</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>CONSENT STATUS</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>STATUS</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>CREATED</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <CircularProgress color="primary" />
                  </TableCell>
                </TableRow>
              ) : contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <EmptyState
                      title="No Contacts Found"
                      description="Add your first contact or bulk import an audience CSV list."
                      icon={<PersonOutlineIcon sx={{ fontSize: 36, color: 'text.secondary' }} />}
                      actionLabel="Add Contact"
                      onAction={handleOpenAddDialog}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                contacts.map(c => (
                  <TableRow key={c.id} hover sx={{ opacity: c.isSuppressed ? 0.7 : 1 }}>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {c.phoneNumber}
                    </TableCell>
                    <TableCell>{c.displayName || '—'}</TableCell>
                    <TableCell>{c.email || '—'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {c.tags.length > 0
                          ? c.tags.map((t, idx) => (
                              <Chip key={idx} label={t} size="small" variant="outlined" />
                            ))
                          : '—'}
                      </Box>
                    </TableCell>
                    <TableCell>{getConsentChip(c.consentStatus)}</TableCell>
                    <TableCell>
                      {c.isSuppressed ? (
                        <Tooltip title={c.suppressionReason || 'Suppressed from marketing campaigns'}>
                          <Chip
                            icon={<BlockIcon fontSize="small" />}
                            label="Suppressed"
                            size="small"
                            color="error"
                            variant="outlined"
                          />
                        </Tooltip>
                      ) : (
                        <Chip
                          icon={<CheckCircleOutlineIcon fontSize="small" />}
                          label="Active"
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                      {new Date(c.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit Contact">
                        <IconButton size="small" onClick={() => handleOpenEditDialog(c)}>
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={c.isSuppressed ? 'Unsuppress Contact' : 'Suppress Contact'}>
                        <IconButton
                          size="small"
                          color={c.isSuppressed ? 'default' : 'warning'}
                          onClick={() => setSuppressTarget(c)}
                        >
                          <BlockIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Contact">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteTarget(c)}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={totalContacts}
          page={page}
          onPageChange={(_e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 50, 100]}
        />
      </Card>

      {/* Add / Edit Contact Dialog */}
      <Dialog
        open={contactDialogOpen}
        onClose={() => !formSubmitting && setContactDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <form onSubmit={handleSaveContact}>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {editingContact ? 'Edit Contact' : 'Add New Contact'}
          </DialogTitle>
          <DialogContent>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
              <TextField
                label="Phone Number"
                placeholder="+1 415 555 2671"
                required
                fullWidth
                disabled={Boolean(editingContact) || formSubmitting}
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
                helperText="Will be normalized into international E.164 format automatically"
              />

              <TextField
                label="Display Name"
                placeholder="e.g. John Doe"
                fullWidth
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                disabled={formSubmitting}
              />

              <TextField
                label="Email Address"
                placeholder="john@example.com"
                type="email"
                fullWidth
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                disabled={formSubmitting}
              />

              <TextField
                label="Tags (Comma-separated)"
                placeholder="VIP, Retail, Lead"
                fullWidth
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                disabled={formSubmitting}
              />

              <FormControl fullWidth>
                <InputLabel>Marketing Consent Status</InputLabel>
                <Select
                  value={consentInput}
                  label="Marketing Consent Status"
                  onChange={e => setConsentInput(e.target.value as ContactOptInStatus)}
                  disabled={formSubmitting}
                >
                  <MenuItem value={ContactOptInStatus.OPTED_IN}>Opted In (Explicit Customer Consent)</MenuItem>
                  <MenuItem value={ContactOptInStatus.OPTED_OUT}>Opted Out</MenuItem>
                  <MenuItem value={ContactOptInStatus.PENDING}>Pending Verification</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Consent Source"
                placeholder="e.g. Checkout Form, Newsletter, Inbound WhatsApp"
                fullWidth
                value={consentSourceInput}
                onChange={e => setConsentSourceInput(e.target.value)}
                disabled={formSubmitting}
                helperText="Audited source of customer opt-in"
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setContactDialogOpen(false)} disabled={formSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary" disabled={formSubmitting}>
              {formSubmitting ? 'Saving...' : editingContact ? 'Update Contact' : 'Create Contact'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={() => !importing && setImportDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <form onSubmit={handleImportSubmit}>
          <DialogTitle sx={{ fontWeight: 700 }}>Import Contacts via CSV</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              Upload a CSV file containing your contact audience. Supported headers: <strong>phone</strong>, <strong>name</strong>, <strong>email</strong>, <strong>tags</strong>, <strong>consent</strong>, <strong>source</strong>.
              Maximum 5,000 rows per batch. Phone numbers are automatically verified and normalized to E.164.
            </Typography>

            {importError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {importError}
              </Alert>
            )}

            {importResult && (
              <Box sx={{ mb: 2 }}>
                <Alert
                  severity={importResult.failedCount > 0 ? 'warning' : 'success'}
                  sx={{ mb: 1.5 }}
                >
                  Processed {importResult.totalProcessed} records: {importResult.createdCount} created, {importResult.updatedCount} updated, {importResult.failedCount} failed.
                </Alert>

                {importResult.errors.length > 0 && (
                  <Paper
                    variant="outlined"
                    sx={{ p: 1.5, maxHeight: 160, overflowY: 'auto', bgcolor: 'rgba(0,0,0,0.02)' }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                      Import Errors ({importResult.errors.length}):
                    </Typography>
                    {importResult.errors.map((err, idx) => (
                      <Typography key={idx} variant="caption" sx={{ display: 'block', color: 'error.main' }}>
                        Line {err.rowNumber}: {err.reason}
                      </Typography>
                    ))}
                  </Paper>
                )}
              </Box>
            )}

            <Box
              sx={{
                border: '2px dashed',
                borderColor: 'primary.light',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                bgcolor: 'rgba(20, 184, 166, 0.02)',
              }}
            >
              <UploadFileIcon sx={{ fontSize: 44, color: 'primary.main', mb: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {csvFile ? csvFile.name : 'Choose a CSV file to upload'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
                {csvFile ? `${(csvFile.size / 1024).toFixed(1)} KB` : 'Comma-separated values (.csv)'}
              </Typography>
              <Button variant="outlined" component="label" disabled={importing}>
                Select CSV File
                <input
                  type="file"
                  accept=".csv,text/csv"
                  hidden
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setCsvFile(e.target.files[0]);
                    }
                  }}
                />
              </Button>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setImportDialogOpen(false)} disabled={importing}>
              Close
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={!csvFile || importing}
              startIcon={importing ? <CircularProgress size={16} /> : <UploadFileIcon />}
            >
              {importing ? 'Processing Import...' : 'Start Import'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Suppression Toggle Dialog */}
      <Dialog
        open={suppressTarget !== null}
        onClose={() => setSuppressTarget(null)}
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {suppressTarget?.isSuppressed ? 'Lift Contact Suppression?' : 'Suppress Contact from Campaigns?'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            {suppressTarget?.isSuppressed
              ? `Allow marketing campaigns to dispatch to ${suppressTarget.phoneNumber} again?`
              : `Suppressing ${suppressTarget?.phoneNumber} will prevent all campaign dispatches to this recipient.`}
          </Typography>
          {!suppressTarget?.isSuppressed && (
            <TextField
              label="Suppression Reason"
              fullWidth
              value={suppressionReason}
              onChange={e => setSuppressionReason(e.target.value)}
              placeholder="e.g. Unsubscribe keyword, Spam complaint, DND request"
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSuppressTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            color={suppressTarget?.isSuppressed ? 'primary' : 'warning'}
            onClick={handleToggleSuppression}
          >
            {suppressTarget?.isSuppressed ? 'Lift Suppression' : 'Suppress Recipient'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>Delete Contact?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Are you sure you want to permanently remove{' '}
            <strong>{deleteTarget?.displayName || deleteTarget?.phoneNumber}</strong> from your workspace directory?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteContact}>
            Delete Contact
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
