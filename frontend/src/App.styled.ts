import styled from '@emotion/styled';
import { Link } from 'react-router-dom';
import { theme } from './styles/theme';

export const Header = styled.header`
  background: ${theme.colors.gradient};
  color: white;
  padding: ${theme.spacing['2xl']} 0;
  margin-bottom: ${theme.spacing['2xl']};
  box-shadow: ${theme.shadows.sm};
`;

export const HeaderContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 ${theme.spacing['2xl']};
`;

export const Title = styled.h1`
  text-align: center;
  font-size: ${theme.fontSizes['6xl']};
  margin-bottom: ${theme.spacing.sm};
`;

export const Subtitle = styled.p`
  text-align: center;
  opacity: 0.9;
`;

export const Nav = styled.nav`
  display: flex;
  gap: ${theme.spacing.lg};
  justify-content: center;
  margin-top: ${theme.spacing.xl};
  flex-wrap: wrap;
`;

export const NavLink = styled(Link)<{ $isActive?: boolean }>`
  color: white;
  text-decoration: none;
  padding: ${theme.spacing.sm} ${theme.spacing.xl};
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.2);
  transition: ${theme.transitions.normal};

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
  }

  ${props => props.$isActive && `
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
  `}
`;

export const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${theme.spacing['2xl']};
`;