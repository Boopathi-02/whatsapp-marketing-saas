import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Button,
  Divider,
  Chip,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Badge,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Tooltip,
  InputAdornment,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';

import SendIcon from '@mui/icons-material/Send';
import SearchIcon from '@mui/icons-material/Search';
import CheckIcon from '@mui/icons-material/Check';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import BoltIcon from '@mui/icons-material/Bolt';
import MarkChatReadOutlinedIcon from '@mui/icons-material/MarkChatReadOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';

import { PageHeader } from '../../../components/common/PageHeader.js';
import { EmptyState } from '../../../components/common/EmptyState.js';
import { useOptionalAuth } from '../../auth/AuthContext.js';
import { api, ApiClientError } from '../../../lib/api.js';
import {
  ConversationDto,
  MessageDto,
  QuickReplyDto,
  TemplateDto,
  WhatsAppAccountDto,
} from '@whatsapp-saas/contracts';
import { MessageStatus } from '@whatsapp-saas/domain';

interface ConversationListResponse {
  items: ConversationDto[];
  total: number;
  page: number;
  limit: number;
}

interface MessageListResponse {
  items: MessageDto[];
  total: number;
  page: number;
  limit: number;
}

interface TemplateListResponse {
  items: TemplateDto[];
  total: number;
}

export const ConversationsPage: React.FC = () => {
  const auth = useOptionalAuth();
  const currentWorkspace = auth?.currentWorkspace;

  // Conversations List State
  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDto | null>(null);
  const [loadingConversations, setLoadingConversations] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);

  // Messages State
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // WhatsApp Accounts (for outbound sender)
  const [accounts, setAccounts] = useState<WhatsAppAccountDto[]>([]);
  const [selectedPhoneNumberId, setSelectedPhoneNumberId] = useState<string>('');

  // Quick Replies State
  const [quickReplies, setQuickReplies] = useState<QuickReplyDto[]>([]);
  const [quickReplyDialogOpen, setQuickReplyDialogOpen] = useState(false);
  const [qrShortcut, setQrShortcut] = useState('');
  const [qrTitle, setQrTitle] = useState('');
  const [qrBody, setQrBody] = useState('');
  const [qrSubmitting, setQrSubmitting] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  // Template Picker State
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [templates, setTemplates] = useState<TemplateDto[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Messages scroll container ref
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load WhatsApp Accounts
  const loadAccounts = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    try {
      const data = await api.get<WhatsAppAccountDto[]>(
        `/workspaces/${currentWorkspace.id}/whatsapp-accounts`
      );
      const connected = data.filter(a => a.status === 'connected');
      setAccounts(connected);
      if (connected.length > 0 && !selectedPhoneNumberId) {
        setSelectedPhoneNumberId(connected[0].phoneNumberId);
      }
    } catch (err) {
      console.error('Failed to load accounts for conversation sender', err);
    }
  }, [currentWorkspace?.id, selectedPhoneNumberId]);

  // Load Quick Replies
  const loadQuickReplies = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    try {
      const data = await api.get<QuickReplyDto[]>(
        `/workspaces/${currentWorkspace.id}/quick-replies`
      );
      setQuickReplies(data);
    } catch (err) {
      console.error('Failed to load quick replies', err);
    }
  }, [currentWorkspace?.id]);

  // Load Conversations
  const loadConversations = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    setLoadingConversations(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', '50');
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (unreadOnly) params.set('unreadOnly', 'true');

      const data = await api.get<ConversationListResponse>(
        `/workspaces/${currentWorkspace.id}/conversations?${params.toString()}`
      );
      setConversations(data.items || []);
      if (selectedConversation) {
        const updated = (data.items || []).find(c => c.id === selectedConversation.id);
        if (updated) setSelectedConversation(updated);
      }
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to load conversations';
      setError(msg);
    } finally {
      setLoadingConversations(false);
    }
  }, [currentWorkspace?.id, searchQuery, unreadOnly, selectedConversation]);

  // Load Messages for Selected Conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    if (!currentWorkspace?.id) return;
    setLoadingMessages(true);
    setError(null);
    try {
      const data = await api.get<MessageListResponse>(
        `/workspaces/${currentWorkspace.id}/conversations/${conversationId}/messages?limit=100`
      );
      setMessages(data.items || []);
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to load messages';
      setError(msg);
    } finally {
      setLoadingMessages(false);
    }
  }, [currentWorkspace?.id]);

  // Initial Load
  useEffect(() => {
    loadAccounts();
    loadQuickReplies();
    loadConversations();
  }, [loadAccounts, loadQuickReplies, loadConversations]);

  // When selected conversation changes, fetch its messages
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      // Automatically mark as read if has unread count
      if (selectedConversation.unreadCount > 0 && currentWorkspace?.id) {
        api.post(`/workspaces/${currentWorkspace.id}/conversations/${selectedConversation.id}/read`)
          .then(() => {
            setConversations(prev =>
              prev.map(c => (c.id === selectedConversation.id ? { ...c, unreadCount: 0 } : c))
            );
          })
          .catch(() => {});
      }
    } else {
      setMessages([]);
    }
  }, [selectedConversation?.id, currentWorkspace?.id]);

  // Send Text Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentWorkspace?.id || !selectedConversation || !messageInput.trim()) return;

    if (!selectedPhoneNumberId) {
      setError('Please select a connected WhatsApp sender account.');
      return;
    }

    setSending(true);
    setError(null);

    const textToSend = messageInput.trim();
    try {
      const newMsg = await api.post<MessageDto>(
        `/workspaces/${currentWorkspace.id}/conversations/${selectedConversation.id}/messages`,
        {
          phoneNumberId: selectedPhoneNumberId,
          recipientPhoneNumber: selectedConversation.phoneNumber,
          type: 'text',
          text: textToSend,
        }
      );

      setMessageInput('');
      setMessages(prev => [...prev, newMsg]);
      // Update snippet in conversation list
      setConversations(prev =>
        prev.map(c =>
          c.id === selectedConversation.id
            ? { ...c, lastMessage: textToSend, lastMessageTimestamp: new Date().toISOString() }
            : c
        )
      );
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to send WhatsApp message';
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  // Quick Reply Selection
  const handleSelectQuickReply = (body: string) => {
    setMessageInput(prev => (prev ? `${prev} ${body}` : body));
  };

  // Create Quick Reply
  const handleCreateQuickReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace?.id) return;

    const formattedShortcut = qrShortcut.startsWith('/') ? qrShortcut.trim() : `/${qrShortcut.trim()}`;
    if (!formattedShortcut || !qrTitle.trim() || !qrBody.trim()) {
      setQrError('Shortcut, title, and body are required.');
      return;
    }

    setQrSubmitting(true);
    setQrError(null);

    try {
      const newQr = await api.post<QuickReplyDto>(
        `/workspaces/${currentWorkspace.id}/quick-replies`,
        {
          shortcut: formattedShortcut,
          title: qrTitle.trim(),
          body: qrBody.trim(),
        }
      );
      setQuickReplies(prev => [...prev, newQr]);
      setQrShortcut('');
      setQrTitle('');
      setQrBody('');
      setSuccess(`Quick reply "${newQr.shortcut}" created!`);
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to create quick reply';
      setQrError(msg);
    } finally {
      setQrSubmitting(false);
    }
  };

  // Delete Quick Reply
  const handleDeleteQuickReply = async (id: string) => {
    if (!currentWorkspace?.id) return;
    try {
      await api.delete(`/workspaces/${currentWorkspace.id}/quick-replies/${id}`);
      setQuickReplies(prev => prev.filter(q => q.id !== id));
      setSuccess('Quick reply deleted.');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to delete quick reply');
    }
  };

  // Open Template Picker
  const handleOpenTemplatePicker = async () => {
    if (!currentWorkspace?.id) return;
    setTemplatePickerOpen(true);
    setLoadingTemplates(true);
    try {
      const res = await api.get<TemplateListResponse>(
        `/workspaces/${currentWorkspace.id}/templates?limit=100`
      );
      const approved = (res.items || []).filter(t => t.status === 'APPROVED');
      setTemplates(approved);
    } catch (err) {
      console.error('Failed to load templates', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Send Template Message
  const handleSendTemplate = async (template: TemplateDto) => {
    if (!currentWorkspace?.id || !selectedConversation) return;
    if (!selectedPhoneNumberId) {
      setError('Please select a connected WhatsApp sender account.');
      return;
    }

    setSending(true);
    setError(null);
    setTemplatePickerOpen(false);

    try {
      const newMsg = await api.post<MessageDto>(
        `/workspaces/${currentWorkspace.id}/conversations/${selectedConversation.id}/messages`,
        {
          phoneNumberId: selectedPhoneNumberId,
          recipientPhoneNumber: selectedConversation.phoneNumber,
          type: 'template',
          templateName: template.name,
          templateLanguage: template.language,
        }
      );

      setMessages(prev => [...prev, newMsg]);
      setSuccess(`Template message "${template.name}" dispatched!`);
      setConversations(prev =>
        prev.map(c =>
          c.id === selectedConversation.id
            ? { ...c, lastMessage: `[Template: ${template.name}]`, lastMessageTimestamp: new Date().toISOString() }
            : c
        )
      );
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to send template message';
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  // Format Status Icon
  const renderMessageStatus = (status: MessageStatus) => {
    switch (status) {
      case MessageStatus.READ:
        return (
          <Tooltip title="Read by customer">
            <DoneAllIcon sx={{ fontSize: 15, color: '#34B7F1' }} />
          </Tooltip>
        );
      case MessageStatus.DELIVERED:
        return (
          <Tooltip title="Delivered to customer device">
            <DoneAllIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
          </Tooltip>
        );
      case MessageStatus.SENT:
        return (
          <Tooltip title="Sent from Meta WhatsApp servers">
            <CheckIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          </Tooltip>
        );
      case MessageStatus.QUEUED:
      case MessageStatus.ACCEPTED:
        return (
          <Tooltip title="Queued for dispatch">
            <ScheduleIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          </Tooltip>
        );
      case MessageStatus.FAILED:
        return (
          <Tooltip title="Delivery failed">
            <ErrorOutlineIcon sx={{ fontSize: 15, color: 'error.main' }} />
          </Tooltip>
        );
      default:
        return null;
    }
  };

  return (
    <Box id="conversations-page-container" sx={{ pb: 4, height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Live WhatsApp Inbox"
        subtitle="Real-time multi-tenant WhatsApp chat threads, customer care messaging, canned quick replies, and Meta template dispatches"
        action={
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<BoltIcon />}
              onClick={() => setQuickReplyDialogOpen(true)}
              sx={{ fontWeight: 600 }}
            >
              Canned Quick Replies ({quickReplies.length})
            </Button>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<RefreshIcon />}
              onClick={() => {
                loadConversations();
                if (selectedConversation) loadMessages(selectedConversation.id);
              }}
            >
              Refresh
            </Button>
          </Box>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Main Inbox Container */}
      <Paper
        variant="outlined"
        sx={{
          flexGrow: 1,
          borderRadius: 2,
          display: 'flex',
          overflow: 'hidden',
          bgcolor: 'background.paper',
        }}
      >
        {/* Left Column: Conversation Thread List */}
        <Box
          sx={{
            width: { xs: '100%', md: 360 },
            borderRight: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: theme => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)'),
          }}
        >
          {/* Thread List Search & Filter Header */}
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                {conversations.length} Active {conversations.length === 1 ? 'Thread' : 'Threads'}
              </Typography>
              <Chip
                label="Unread Only"
                size="small"
                clickable
                color={unreadOnly ? 'primary' : 'default'}
                variant={unreadOnly ? 'filled' : 'outlined'}
                onClick={() => setUnreadOnly(!unreadOnly)}
                sx={{ height: 22, fontSize: '0.7rem' }}
              />
            </Box>
          </Box>

          {/* Conversations Scrollable List */}
          <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
            {loadingConversations ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress size={28} />
              </Box>
            ) : conversations.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <ForumOutlinedIcon sx={{ fontSize: 44, color: 'text.secondary', opacity: 0.5, mb: 1 }} />
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  No Conversations Yet
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Inbound customer WhatsApp messages or campaign replies will appear here in real time.
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {conversations.map(conv => {
                  const isSelected = selectedConversation?.id === conv.id;
                  return (
                    <React.Fragment key={conv.id}>
                      <ListItemButton
                        selected={isSelected}
                        onClick={() => setSelectedConversation(conv)}
                        sx={{
                          py: 1.5,
                          px: 2,
                          '&.Mui-selected': {
                            bgcolor: theme =>
                              theme.palette.mode === 'dark' ? 'rgba(20, 184, 166, 0.15)' : 'rgba(20, 184, 166, 0.08)',
                            borderLeft: '4px solid #14B8A6',
                          },
                        }}
                      >
                        <ListItemAvatar>
                          <Badge
                            badgeContent={conv.unreadCount}
                            color="primary"
                            invisible={conv.unreadCount === 0}
                            sx={{ '& .MuiBadge-badge': { fontWeight: 700 } }}
                          >
                            <Avatar sx={{ bgcolor: 'primary.light', color: '#fff', width: 42, height: 42 }}>
                              <PersonOutlineIcon />
                            </Avatar>
                          </Badge>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="subtitle2" noWrap sx={{ fontWeight: conv.unreadCount > 0 ? 700 : 600 }}>
                                {conv.contactName || conv.phoneNumber}
                              </Typography>
                              {conv.lastMessageTimestamp && (
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                  {new Date(conv.lastMessageTimestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </Typography>
                              )}
                            </Box>
                          }
                          secondary={
                            <Typography
                              variant="body2"
                              noWrap
                              sx={{
                                color: conv.unreadCount > 0 ? 'text.primary' : 'text.secondary',
                                fontWeight: conv.unreadCount > 0 ? 600 : 400,
                                fontSize: '0.825rem',
                                mt: 0.25,
                              }}
                            >
                              {conv.lastMessage || 'No messages yet'}
                            </Typography>
                          }
                        />
                      </ListItemButton>
                      <Divider component="li" />
                    </React.Fragment>
                  );
                })}
              </List>
            )}
          </Box>
        </Box>

        {/* Right Column: Chat History & Composer */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedConversation ? (
            <>
              {/* Chat Thread Header */}
              <Box
                sx={{
                  p: 2,
                  px: 3,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  bgcolor: theme => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'),
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: '#128C7E', width: 40, height: 40 }}>
                    <PersonOutlineIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                      {selectedConversation.contactName || selectedConversation.phoneNumber}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                      {selectedConversation.phoneNumber}
                    </Typography>
                  </Box>
                </Box>

                {/* Account Selection and Actions */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {accounts.length > 0 && (
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                      <InputLabel>Sender Number</InputLabel>
                      <Select
                        value={selectedPhoneNumberId}
                        label="Sender Number"
                        onChange={e => setSelectedPhoneNumberId(e.target.value)}
                      >
                        {accounts.map(acc => (
                          <MenuItem key={acc.phoneNumberId} value={acc.phoneNumberId}>
                            {acc.displayName || acc.displayPhoneNumber}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    startIcon={<MarkChatReadOutlinedIcon />}
                    onClick={handleOpenTemplatePicker}
                  >
                    Send Template
                  </Button>
                </Box>
              </Box>

              {/* Chat Messages Timeline */}
              <Box
                sx={{
                  flexGrow: 1,
                  p: 3,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                  bgcolor: theme =>
                    theme.palette.mode === 'dark' ? '#0b141a' : '#efeae2',
                  backgroundImage: theme =>
                    theme.palette.mode === 'dark'
                      ? 'none'
                      : 'radial-gradient(#d1d7db 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              >
                {loadingMessages ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress size={32} />
                  </Box>
                ) : messages.length === 0 ? (
                  <Box sx={{ m: 'auto', textAlign: 'center', p: 4, bgcolor: 'background.paper', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      No messages in this conversation. Start the chat below!
                    </Typography>
                  </Box>
                ) : (
                  messages.map(msg => {
                    const isOutbound = msg.direction === 'outbound';
                    return (
                      <Box
                        key={msg.id}
                        sx={{
                          display: 'flex',
                          justifyContent: isOutbound ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <Paper
                          elevation={1}
                          sx={{
                            maxWidth: '70%',
                            p: 1.5,
                            px: 2,
                            borderRadius: 2,
                            borderTopRightRadius: isOutbound ? 0 : 2,
                            borderTopLeftRadius: isOutbound ? 2 : 0,
                            bgcolor: isOutbound
                              ? theme => (theme.palette.mode === 'dark' ? '#005c4b' : '#d9fdd3')
                              : theme => (theme.palette.mode === 'dark' ? '#202c33' : '#ffffff'),
                            color: theme =>
                              isOutbound
                                ? theme.palette.mode === 'dark'
                                  ? '#e9edef'
                                  : '#111b21'
                                : 'text.primary',
                          }}
                        >
                          {/* Media Preview if attached */}
                          {msg.mediaUrl && (
                            <Box sx={{ mb: 1, borderRadius: 1, overflow: 'hidden' }}>
                              <img
                                src={msg.mediaUrl}
                                alt="WhatsApp media attachment"
                                style={{ maxWidth: '100%', maxHeight: 240, objectFit: 'contain' }}
                              />
                            </Box>
                          )}

                          {/* Message Content */}
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {msg.content || (msg.type === 'template' ? `[Template Message]` : '')}
                          </Typography>

                          {/* Footer: Timestamp and Status */}
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: 0.5,
                              mt: 0.5,
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                fontSize: '0.65rem',
                                color: theme =>
                                  isOutbound
                                    ? theme.palette.mode === 'dark'
                                      ? 'rgba(255,255,255,0.6)'
                                      : 'rgba(0,0,0,0.45)'
                                    : 'text.secondary',
                              }}
                            >
                              {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Typography>
                            {isOutbound && renderMessageStatus(msg.status)}
                          </Box>
                        </Paper>
                      </Box>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </Box>

              {/* Quick Reply Shortcut Chips Bar */}
              {quickReplies.length > 0 && (
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    overflowX: 'auto',
                    bgcolor: 'background.paper',
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, flexShrink: 0 }}>
                    Quick Replies:
                  </Typography>
                  {quickReplies.map(qr => (
                    <Chip
                      key={qr.id}
                      label={qr.shortcut}
                      size="small"
                      clickable
                      onClick={() => handleSelectQuickReply(qr.body)}
                      sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                    />
                  ))}
                </Box>
              )}

              {/* Chat Message Input Composer */}
              <Box
                component="form"
                onSubmit={handleSendMessage}
                sx={{
                  p: 2,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  size="small"
                  placeholder="Type a WhatsApp message or select a Quick Reply above... (Press Enter to send)"
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={sending}
                />
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={!messageInput.trim() || sending}
                  endIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                  sx={{ px: 3, fontWeight: 700, minHeight: 40 }}
                >
                  Send
                </Button>
              </Box>
            </>
          ) : (
            <EmptyState
              title="Select a Conversation"
              description="Pick a chat thread from the left panel to read message history, send replies, or dispatch WhatsApp templates."
              icon={<ForumOutlinedIcon sx={{ fontSize: 44, color: '#14B8A6' }} />}
            />
          )}
        </Box>
      </Paper>

      {/* Quick Replies Management Dialog */}
      <Dialog
        open={quickReplyDialogOpen}
        onClose={() => setQuickReplyDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <BoltIcon color="primary" />
          Canned Quick Replies
        </DialogTitle>
        <DialogContent dividers>
          {qrError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {qrError}
            </Alert>
          )}

          {/* Create New Quick Reply Form */}
          <Box component="form" onSubmit={handleCreateQuickReply} sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
              Add New Canned Response
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <TextField
                  label="Shortcut"
                  placeholder="/welcome"
                  size="small"
                  fullWidth
                  required
                  value={qrShortcut}
                  onChange={e => setQrShortcut(e.target.value)}
                  helperText="Must start with /"
                />
                <TextField
                  label="Title"
                  placeholder="Greeting"
                  size="small"
                  fullWidth
                  required
                  value={qrTitle}
                  onChange={e => setQrTitle(e.target.value)}
                />
              </Box>
              <TextField
                label="Message Body"
                placeholder="Hi there! Thanks for contacting Pingza support. How can we help you today?"
                multiline
                rows={2}
                size="small"
                fullWidth
                required
                value={qrBody}
                onChange={e => setQrBody(e.target.value)}
              />
              <Button
                type="submit"
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                disabled={qrSubmitting}
                sx={{ alignSelf: 'flex-end', fontWeight: 600 }}
              >
                {qrSubmitting ? 'Saving...' : 'Save Quick Reply'}
              </Button>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* List of Existing Quick Replies */}
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Configured Quick Replies ({quickReplies.length})
          </Typography>
          {quickReplies.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No quick replies configured yet. Add your first canned template above.
            </Typography>
          ) : (
            <List disablePadding>
              {quickReplies.map(qr => (
                <Paper key={qr.id} variant="outlined" sx={{ p: 1.5, mb: 1, borderRadius: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label={qr.shortcut} size="small" color="primary" sx={{ fontWeight: 700 }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {qr.title}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, fontSize: '0.85rem' }}>
                        {qr.body}
                      </Typography>
                    </Box>
                    <IconButton size="small" color="error" onClick={() => handleDeleteQuickReply(qr.id)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Paper>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setQuickReplyDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Template Picker Dialog */}
      <Dialog
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Send Approved WhatsApp Message Template
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Message templates allow initiating chats outside Meta's 24-hour customer care window. Only approved templates are listed.
          </Typography>

          {loadingTemplates ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : templates.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', py: 2 }}>
              No approved templates found in Meta WhatsApp Business Account. Synchronize or create templates in the Message Templates studio.
            </Typography>
          ) : (
            <List disablePadding>
              {templates.map(tpl => (
                <Paper
                  key={tpl.id}
                  variant="outlined"
                  sx={{
                    p: 2,
                    mb: 1.5,
                    borderRadius: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box sx={{ pr: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {tpl.name}
                      </Typography>
                      <Chip label={tpl.category} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                      <Chip label={tpl.language} size="small" sx={{ fontSize: '0.65rem' }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                      Status: {tpl.status}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    disabled={sending}
                    onClick={() => handleSendTemplate(tpl)}
                    sx={{ flexShrink: 0, fontWeight: 600 }}
                  >
                    Send Template
                  </Button>
                </Paper>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setTemplatePickerOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
