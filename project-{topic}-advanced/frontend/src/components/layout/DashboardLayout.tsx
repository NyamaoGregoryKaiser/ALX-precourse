```typescript
import React, { useState } from 'react';
import { Layout, Menu, Button, theme, message } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DatabaseOutlined,
  TableOutlined,
  BarChartOutlined,
  DashboardOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../../assets/logo.svg';

const { Header, Sider, Content } = Layout;

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    {
      key: '/app/data-sources',
      icon: <DatabaseOutlined />,
      label: <Link to="/app/data-sources">Data Sources</Link>,
    },
    {
      key: '/app/datasets',
      icon: <TableOutlined />,
      label: <Link to="/app/datasets">Datasets</Link>,
    },
    {
      key: '/app/visualizations',
      icon: <BarChartOutlined />,
      label: <Link to="/app/visualizations">Visualizations</Link>,
    },
    {
      key: '/app/dashboards',
      icon: <DashboardOutlined />,
      label: <Link to="/app/dashboards">Dashboards</Link>,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="light">
        <div className="demo-logo-vertical" style={{ padding: '16px', textAlign: 'center' }}>
          <img src={Logo} alt="Logo" style={{ width: collapsed ? '40px' : '120px', transition: 'width 0.2s' }} />
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />
          <div style={{ marginRight: '24px' }}>
            <span style={{ marginRight: '16px' }}>
              <UserOutlined /> {user?.email} ({user?.role})
            </span>
            <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default DashboardLayout;
```