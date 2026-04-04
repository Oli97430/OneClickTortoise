import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <Paper sx={{ p: 4, maxWidth: 600, textAlign: 'center' }}>
            <Typography variant="h4" color="error" gutterBottom>
              Oups ! Une erreur est survenue
            </Typography>
            <Typography variant="body1" sx={{ mt: 2, mb: 3 }}>
              {this.state.error?.message || 'Une erreur inattendue s\'est produite.'}
            </Typography>
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <Box sx={{ mt: 2, mb: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1, textAlign: 'left' }}>
                <Typography variant="caption" component="pre" sx={{ overflow: 'auto', fontSize: '0.75rem' }}>
                  {this.state.errorInfo.componentStack}
                </Typography>
              </Box>
            )}
            <Button variant="contained" color="primary" onClick={this.handleReset}>
              Retour à l'accueil
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

