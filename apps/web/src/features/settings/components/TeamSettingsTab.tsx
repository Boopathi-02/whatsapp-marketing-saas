import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SearchIcon from '@mui/icons-material/Search';
import { api } from '../../../lib/api.js';
import { useAuth } from '../../auth/AuthContext.js';
import { WorkspaceRole, WorkspaceMemberDto } from '@whatsapp-saas/contracts';

type AssignableRole = 'admin' | 'member' | 'viewer';

export const TeamSettingsTab: React.FC = () => {
  const { currentWorkspace, user } = useAuth();
  const [members, setMembers] = useState<WorkspaceMemberDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Current user's role in the active workspace
  const currentMember = members.find(m => m.userId === user?.id);
  const isOwner = currentMember?.role === 'owner';
  const isAdmin = isOwner || currentMember?.role === 'admin';

  // Action Menu state
  const [actionAnchor, setActionAnchor] = useState<null | HTMLElement>(null);
  const [selectedMember, setSelectedMember] = useState<WorkspaceMemberDto | null>(null);

  // Invite Dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AssignableRole>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Change Role Dialog state
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState<AssignableRole>('member');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Transfer Ownership Dialog state
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await api.get<WorkspaceMemberDto[]>(`/workspaces/${currentWorkspace.id}/members`);
      setMembers(data);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch team members.');
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleOpenActionMenu = (event: React.MouseEvent<HTMLElement>, member: WorkspaceMemberDto) => {
    setActionAnchor(event.currentTarget);
    setSelectedMember(member);
  };

  const handleCloseActionMenu = () => {
    setActionAnchor(null);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace?.id) return;
    setInviteError(null);

    try {
      setIsInviting(true);
      await api.post(`/workspaces/${currentWorkspace.id}/invitations`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });

      setSuccessMessage(`Invitation dispatched to ${inviteEmail.trim()}`);
      setInviteEmail('');
      setInviteOpen(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invitation.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleChangeRole = async () => {
    if (!currentWorkspace?.id || !selectedMember) return;
    try {
      setIsUpdatingRole(true);
      await api.patch(`/workspaces/${currentWorkspace.id}/members/${selectedMember.userId}`, {
        role: newRole,
      });
      setSuccessMessage(`Role updated for ${selectedMember.user.displayName}`);
      setRoleDialogOpen(false);
      handleCloseActionMenu();
      await fetchMembers();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update member role.');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!currentWorkspace?.id || !selectedMember) return;
    handleCloseActionMenu();

    if (!window.confirm(`Are you sure you want to remove ${selectedMember.user.displayName} from this workspace?`)) {
      return;
    }

    try {
      await api.delete(`/workspaces/${currentWorkspace.id}/members/${selectedMember.userId}`);
      setSuccessMessage(`${selectedMember.user.displayName} removed from workspace.`);
      await fetchMembers();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to remove member.');
    }
  };

  const handleTransferOwnership = async () => {
    if (!currentWorkspace?.id || !selectedMember) return;
    try {
      setIsTransferring(true);
      await api.post(`/workspaces/${currentWorkspace.id}/transfer-ownership`, {
        targetUserId: selectedMember.userId,
      });
      setSuccessMessage(`Ownership transferred to ${selectedMember.user.displayName}.`);
      setTransferDialogOpen(false);
      handleCloseActionMenu();
      await fetchMembers();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to transfer ownership.');
    } finally {
      setIsTransferring(false);
    }
  };

  const getRoleChipColor = (role: WorkspaceRole) => {
    switch (role) {
      case 'owner':
        return 'primary';
      case 'admin':
        return 'info';
      case 'member':
        return 'success';
      case 'viewer':
      default:
        return 'default';
    }
  };

  const filteredMembers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return members;
    return members.filter(
      m =>
        m.user.displayName.toLowerCase().includes(q) ||
        m.user.email.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q)
    );
  }, [members, searchQuery]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Tab Header Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h5" fontWeight={700}>
              Team & Workspace Members
            </Typography>
            <Chip
              label={`${members.length} Member${members.length === 1 ? '' : 's'}`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Manage member access permissions, roles, and pending email invitations.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            size="small"
            placeholder="Search members…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{ width: { xs: '100%', sm: 220 } }}
          />

          {isAdmin && (
            <Button
              id="btn-invite-member"
              variant="contained"
              color="primary"
              startIcon={<PersonAddOutlinedIcon />}
              onClick={() => setInviteOpen(true)}
              sx={{ fontWeight: 700, borderRadius: 2, whiteSpace: 'nowrap' }}
            >
              Invite Member
            </Button>
          )}
        </Box>
      </Box>

      {successMessage && (
        <Alert severity="success" onClose={() => setSuccessMessage(null)} sx={{ borderRadius: 2 }}>
          {successMessage}
        </Alert>
      )}

      {errorMessage && (
        <Alert severity="error" onClose={() => setErrorMessage(null)} sx={{ borderRadius: 2 }}>
          {errorMessage}
        </Alert>
      )}

      {/* Members Table */}
      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Member</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Joined Date</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <Typography variant="body1" color="text.secondary">
                      {searchQuery ? 'No matching members found.' : 'No members found in this workspace.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers.map(member => {
                  const isSelf = member.userId === user?.id;
                  const isMemberOwner = member.role === 'owner';

                  return (
                    <TableRow key={member.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar
                            sx={{
                              width: 38,
                              height: 38,
                              bgcolor: 'primary.main',
                              fontWeight: 700,
                              fontSize: '0.9rem',
                            }}
                          >
                            {member.user.displayName.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle2" fontWeight={700}>
                                {member.user.displayName}
                              </Typography>
                              {isSelf && (
                                <Chip
                                  label="You"
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                  sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 600 }}
                                />
                              )}
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {member.user.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={member.role.toUpperCase()}
                          color={getRoleChipColor(member.role)}
                          size="small"
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={member.status.toUpperCase()}
                          color={member.status === 'active' ? 'success' : 'default'}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : '—'}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        {isAdmin && !isMemberOwner && !isSelf ? (
                          <IconButton
                            id={`btn-member-actions-${member.id}`}
                            size="small"
                            onClick={e => handleOpenActionMenu(e, member)}
                            aria-label={`Actions for ${member.user.displayName}`}
                          >
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            {isMemberOwner ? 'Owner' : isSelf ? 'Current' : '—'}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Member Action Menu */}
      <Menu
        anchorEl={actionAnchor}
        open={Boolean(actionAnchor)}
        onClose={handleCloseActionMenu}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem
          id="menu-change-role"
          onClick={() => {
            if (selectedMember) {
              setNewRole(selectedMember.role as AssignableRole);
              setRoleDialogOpen(true);
            }
          }}
        >
          <ListItemIcon>
            <SecurityOutlinedIcon fontSize="small" />
          </ListItemIcon>
          Change Role
        </MenuItem>

        {isOwner && (
          <MenuItem
            id="menu-transfer-ownership"
            onClick={() => {
              setTransferDialogOpen(true);
            }}
          >
            <ListItemIcon>
              <SwapHorizIcon fontSize="small" />
            </ListItemIcon>
            Transfer Ownership
          </MenuItem>
        )}

        <MenuItem
          id="menu-remove-member"
          onClick={handleRemoveMember}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon sx={{ color: 'error.main' }}>
            <DeleteOutlineIcon fontSize="small" />
          </ListItemIcon>
          Remove From Workspace
        </MenuItem>
      </Menu>

      {/* Invite Member Dialog */}
      <Dialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <Box component="form" onSubmit={handleSendInvite}>
          <DialogTitle sx={{ fontWeight: 700 }}>Invite Team Member</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            {inviteError && <Alert severity="error">{inviteError}</Alert>}

            <Typography variant="body2" color="text.secondary">
              Invitations generate a secure single-use token sent to the member's email address.
            </Typography>

            <TextField
              id="input-invite-email"
              label="Email Address"
              type="email"
              required
              fullWidth
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
            />

            <FormControl fullWidth>
              <InputLabel id="invite-role-label">Workspace Role</InputLabel>
              <Select
                labelId="invite-role-label"
                id="select-invite-role"
                value={inviteRole}
                label="Workspace Role"
                onChange={e => setInviteRole(e.target.value as AssignableRole)}
              >
                <MenuItem value="member">
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      Member
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Can view and send campaigns, chat in live inbox, and manage contacts
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="admin">
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      Admin
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Full access to channels, templates, billing, and team management
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="viewer">
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      Viewer
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Read-only access to campaign analytics, contacts, and reports
                    </Typography>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setInviteOpen(false)} color="inherit" disabled={isInviting}>
              Cancel
            </Button>
            <Button
              id="btn-submit-invite"
              type="submit"
              variant="contained"
              color="primary"
              disabled={isInviting || !inviteEmail.trim()}
              sx={{ fontWeight: 700 }}
            >
              {isInviting ? <CircularProgress size={20} color="inherit" /> : 'Send Invite'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog
        open={roleDialogOpen}
        onClose={() => setRoleDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Change Role for {selectedMember?.user.displayName}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Select the new permission level for this user in {currentWorkspace?.name}.
          </Typography>
          <FormControl fullWidth>
            <InputLabel id="role-select-label">New Role</InputLabel>
            <Select
              labelId="role-select-label"
              id="select-change-role"
              value={newRole}
              label="New Role"
              onChange={e => setNewRole(e.target.value as AssignableRole)}
            >
              <MenuItem value="admin">Admin (Manage Team & Billing)</MenuItem>
              <MenuItem value="member">Member (Campaigns & Conversations)</MenuItem>
              <MenuItem value="viewer">Viewer (Read-Only)</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setRoleDialogOpen(false)} color="inherit" disabled={isUpdatingRole}>
            Cancel
          </Button>
          <Button
            id="btn-save-role-change"
            variant="contained"
            color="primary"
            onClick={handleChangeRole}
            disabled={isUpdatingRole}
            sx={{ fontWeight: 700 }}
          >
            {isUpdatingRole ? <CircularProgress size={20} color="inherit" /> : 'Update Role'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transfer Ownership Dialog */}
      <Dialog
        open={transferDialogOpen}
        onClose={() => setTransferDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>
          Transfer Organization Ownership
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Alert severity="warning">
            This action will make <strong>{selectedMember?.user.displayName}</strong> the primary owner of{' '}
            <strong>{currentWorkspace?.name}</strong>. Your own access will be demoted to Admin.
          </Alert>
          <Typography variant="body2">
            Are you sure you want to transfer workspace ownership? This action is immediate.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setTransferDialogOpen(false)} color="inherit" disabled={isTransferring}>
            Cancel
          </Button>
          <Button
            id="btn-confirm-transfer-ownership"
            variant="contained"
            color="error"
            onClick={handleTransferOwnership}
            disabled={isTransferring}
            sx={{ fontWeight: 700 }}
          >
            {isTransferring ? <CircularProgress size={20} color="inherit" /> : 'Confirm Transfer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
