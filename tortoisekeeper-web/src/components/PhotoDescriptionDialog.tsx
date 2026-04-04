import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';

interface PhotoDescriptionDialogProps {
  open: boolean;
  initialDescription?: string;
  onClose: () => void;
  onSave: (desc: string) => void;
}

const PhotoDescriptionDialog: React.FC<PhotoDescriptionDialogProps> = ({ open, initialDescription = '', onClose, onSave }) => {
  const [desc, setDesc] = useState(initialDescription);

  React.useEffect(() => {
    setDesc(initialDescription || '');
  }, [initialDescription, open]);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Ajouter ou modifier la description</DialogTitle>
      <DialogContent>
        <TextField
          value={desc}
          onChange={e => setDesc(e.target.value)}
          multiline
          minRows={2}
          maxRows={6}
          fullWidth
          autoFocus
          label="Description ou anecdote"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={() => onSave(desc)} variant="contained">Enregistrer</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PhotoDescriptionDialog;
