import React, { useState, useRef } from 'react';
import { IconButton, Drawer, Box, TextField, Button, List, ListItem, ListItemText, Typography } from '@mui/material';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';

interface ChatMessage { role: 'user' | 'assistant'; content: string; }

const Chatbot: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Salut ! Je suis ton assistant OneClickTortoise. Pose-moi une question.' }
  ]);
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLUListElement>(null);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage: ChatMessage = { role: 'user', content: input };
    const newMsgs = [...messages, userMessage];
    setMessages(newMsgs);
    setInput('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMsgs })
      });
      const data = await res.json();
      if (data.reply?.content) {
        const assistantMessage: ChatMessage = { role: 'assistant', content: data.reply.content };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (err) {
      console.error('Chatbot error', err);
      const errorMessage: ChatMessage = { role: 'assistant', content: 'Désolé, une erreur est survenue.' };
      setMessages(prev => [...prev, errorMessage]);
    }
    setTimeout(
      () => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }),
      100
    );
  };

  return (
    <>
      <IconButton
        onClick={() => setOpen(true)}
        sx={{ position: 'fixed', bottom: 16, right: 16, bgcolor: 'secondary.main', color: '#fff', '&:hover': { bgcolor: 'secondary.dark' } }}
      >
        <ChatBubbleIcon />
      </IconButton>
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 360, p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Typography variant="h6" mb={2}>Assistant OneClickTortoise</Typography>
          <List ref={listRef} sx={{ flexGrow: 1, overflowY: 'auto' }}>
            {messages.map((m, i) => (
              <ListItem key={i} sx={{ justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <ListItemText
                  primary={m.content}
                  primaryTypographyProps={{ color: m.role === 'user' ? 'primary' : 'text.primary' }}
                />
              </ListItem>
            ))}
          </List>
          <Box sx={{ display: 'flex', mt: 1 }}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            <Button onClick={sendMessage} sx={{ ml: 1 }} variant="contained">Envoyer</Button>
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

export default Chatbot;
