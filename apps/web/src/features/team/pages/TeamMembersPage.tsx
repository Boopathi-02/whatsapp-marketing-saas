import React, { useState, useEffect, useCallback } from 'react';
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
} from '@mui/material';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { api } from '../../../lib/api.js';
import { useAuth } from '../../auth/AuthContext.js';
import { WorkspaceRole, WorkspaceMemberDto } from '@whatsapp-saas/contracts';

type AssignableRole = 'admin' | 'member' | 'viewer';

export const TeamMembersPage: React.FC = () => {
  const { currentWorkspace, user } = useAuth();
  const [members, setMembers] = useState<WorkspaceMemberDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Team & Workspace Members
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage roles, access levels, and team invitations for {currentWorkspace?.name || 'this workspace'}
          </Typography>
        </Box>

        {isAdmin && (
          <Button
            id="btn-invite-member"
            variant="contained"
            color="primary"
            startIcon={<PersonAddOutlinedIcon />}
            onClick={() => setInviteOpen(true)}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Invite Member
          </Button>
        )}
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
                <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">No members found in this workspace.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                members.map(member => (
                  <TableRow key={member.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.dark', fontSize: '0.875rem' }}>
                          {member.user.displayName.substring(0, 2).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {member.user.displayName}
                            {member.userId === user?.id && ' (You)'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {member.user.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={member.role.toUpperCase()}
                        size="small"
                        color={getRoleChipColor(member.role)}
                        sx={{ fontWeight: 700, fontSize: '0.6875rem' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={member.status}
                        size="small"
                        variant="outlined"
                        color={member.status === 'active' ? 'success' : 'warning'}
                        sx={{ height: 22, textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {isAdmin && member.userId !== user?.id && (
                        <IconButton
                          id={`btn-member-action-${member.id}`}
                          onClick={e => handleOpenActionMenu(e, member)}
                          size="small"
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))
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
          onClick={() => {
            if (selectedMember && selectedMember.role !== 'owner') {
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

        {isOwner && selectedMember?.role !== 'owner' && (
          <MenuItem
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

        <MenuItem onClick={handleRemoveMember} sx={{ color: 'error.main' }}>
          <ListItemIcon sx={{ color: 'error.main' }}>
            <DeleteOutlineIcon fontSize="small" />
          </ListItemIcon>
          Remove from Workspace
        </MenuItem>
      </Menu>

      {/* Invite Member Dialog */}
      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleSendInvite}>
          <DialogTitle sx={{ fontWeight: 700 }}>Invite Team Member</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {inviteError && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {inviteError}
              </Alert>
            )}
            <TextField
              id="input-invite-email"
              label="Email Address"
              type="email"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              required
              fullWidth
              autoFocus
            />

            <FormControl fullWidth>
              <InputLabel id="label-invite-role">Workspace Role</InputLabel>
              <Select
                id="select-invite-role"
                labelId="label-invite-role"
                label="Workspace Role"
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as AssignableRole)}
              >
                {isOwner && <MenuItem value="admin">Administrator (Full control except ownership)</MenuItem>}
                <MenuItem value="member">Member (Can manage templates & campaigns)</MenuItem>
                <MenuItem value="viewer">Viewer (Read-only access)</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setInviteOpen(false)} color="inherit" disabled={isInviting}>
              Cancel
            </Button>
            <Button
              id="btn-confirm-send-invite"
              type="submit"
              variant="contained"
              color="primary"
              disabled={isInviting}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              {isInviting ? <CircularProgress size={20} color="inherit" /> : 'Send Invitation'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Change Member Role</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Assign a new permission role for {selectedMember?.user.displayName}.
          </Typography>
          <FormControl fullWidth>
            <InputLabel id="label-change-role">New Role</InputLabel>
            <Select
              id="select-change-role"
              labelId="label-change-role"
              label="New Role"
              value={newRole}
              onChange={e => setNewRole(e.target.value as AssignableRole)}
            >
              {isOwner && <MenuItem value="admin">Administrator</MenuItem>}
              <MenuItem value="member">Member</MenuItem>
              <MenuItem value="viewer">Viewer</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setRoleDialogOpen(false)} color="inherit" disabled={isUpdatingRole}>
            Cancel
          </Button>
          <Button
            id="btn-confirm-role-change"
            variant="contained"
            color="primary"
            onClick={handleChangeRole}
            disabled={isUpdatingRole}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            {isUpdatingRole ? <CircularProgress size={20} color="inherit" /> : 'Save Role'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transfer Ownership Dialog */}
      <Dialog open={transferDialogOpen} onClose={() => setTransferDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: 'warning.main' }}>Transfer Ownership</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
            This action will make {selectedMember?.user.displayName} the new owner of this workspace. You will be demoted to Administrator.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to transfer ownership of {currentWorkspace?.name}?
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
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            {isTransferring ? <CircularProgress size={20} color="inherit" /> : 'Confirm Transfer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
