import React, { useState } from 'react';
import { Box, Paper, Tab, Tabs } from '@mui/material';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const AuthPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const switchToLogin = () => setTabValue(0);
  const switchToRegister = () => setTabValue(1);

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Paper elevation={8} sx={{ width: '100%', maxWidth: 500, mx: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="authentication tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Sign In" />
          <Tab label="Sign Up" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <LoginForm onSwitchToRegister={switchToRegister} />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <RegisterForm onSwitchToLogin={switchToLogin} />
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default AuthPage; 