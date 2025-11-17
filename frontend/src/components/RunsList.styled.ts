import styled from '@emotion/styled';
import { theme } from '../styles/theme';

export const RunsDashboard = styled.div`
  margin-bottom: ${theme.spacing.xl};
`;

export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.xl};
`;

export const SummaryCard = styled.div`
  background: ${theme.colors.cardBg};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.lg};
  box-shadow: ${theme.shadows.sm};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};

  span:first-of-type {
    font-size: ${theme.fontSizes.base};
    color: ${theme.colors.textSecondary};
  }

  strong {
    font-size: ${theme.fontSizes['2xl']};
    color: ${theme.colors.text};
  }

  .muted {
    font-size: ${theme.fontSizes.base};
    color: ${theme.colors.textMuted};
  }
`;

export const ProviderList = styled.ul`
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};

  li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: ${theme.fontSizes.base};

    strong:first-of-type {
      text-transform: capitalize;
      font-size: ${theme.fontSizes.base};
    }

    strong:last-of-type {
      font-size: ${theme.fontSizes.lg};
      color: ${theme.colors.primary};
    }
  }
`;

export const DashboardColumns = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.xl};
`;

export const SeverityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

export const SeverityRow = styled.div`
  display: grid;
  grid-template-columns: 80px 1fr 50px;
  align-items: center;
  gap: ${theme.spacing.md};

  > span:last-child {
    text-align: right;
    font-weight: 600;
  }
`;

export const SeverityBadge = styled.span<{ severity?: string }>`
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.xl};
  font-size: ${theme.fontSizes.sm};
  font-weight: 600;
  text-transform: uppercase;
  
  ${props => {
    switch (props.severity) {
      case 'blocker':
        return `
          background: ${theme.colors.findingBg.blocker};
          color: ${theme.colors.severity.blocker};
        `;
      case 'critical':
        return `
          background: ${theme.colors.findingBg.critical};
          color: ${theme.colors.severity.critical};
        `;
      case 'major':
        return `
          background: ${theme.colors.findingBg.major};
          color: ${theme.colors.severity.major};
        `;
      case 'minor':
        return `
          background: ${theme.colors.findingBg.minor};
          color: ${theme.colors.severity.minor};
        `;
      case 'info':
        return `
          background: ${theme.colors.findingBg.info};
          color: ${theme.colors.severity.info};
        `;
      default:
        return '';
    }
  }}
`;

export const SeverityMeter = styled.div`
  background: ${theme.colors.borderLight};
  border-radius: ${theme.borderRadius.full};
  height: 8px;
  overflow: hidden;
`;

export const SeverityMeterFill = styled.div<{ severity?: string }>`
  height: 100%;
  transition: width 0.3s ease;
  
  ${props => {
    switch (props.severity) {
      case 'blocker':
        return `background: ${theme.colors.severity.blocker};`;
      case 'critical':
        return `background: ${theme.colors.severity.critical};`;
      case 'major':
        return `background: ${theme.colors.severity.major};`;
      case 'minor':
        return `background: ${theme.colors.severity.minor};`;
      case 'info':
        return `background: ${theme.colors.severity.info};`;
      default:
        return `background: ${theme.colors.primary};`;
    }
  }}
`;

export const KpiAlerts = styled.ul`
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};

  li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: ${theme.spacing.md};
    background: ${theme.colors.background};
    border-radius: ${theme.borderRadius.md};
    gap: ${theme.spacing.md};

    > div {
      flex: 1;

      strong {
        color: ${theme.colors.text};
        font-size: ${theme.fontSizes.base};
      }

      span {
        font-size: ${theme.fontSizes.sm};
        color: ${theme.colors.textSecondary};
      }
    }
  }
`;

export const UrgentList = styled.ul`
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};

  li {
    display: flex;
    align-items: flex-start;
    gap: ${theme.spacing.md};
    padding: ${theme.spacing.md};
    background: ${theme.colors.background};
    border-radius: ${theme.borderRadius.md};

    > div {
      flex: 1;

      strong {
        color: ${theme.colors.text};
        font-size: ${theme.fontSizes.base};
        margin-bottom: ${theme.spacing.xs};
        display: block;
      }

      p {
        font-size: ${theme.fontSizes.sm};
        color: ${theme.colors.textSecondary};
        margin: 0;
      }
    }
  }
`;

export const SeverityPill = styled.span<{ severity?: string }>`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSizes.xs};
  font-weight: 600;
  text-transform: uppercase;
  white-space: nowrap;
  
  ${props => {
    switch (props.severity) {
      case 'blocker':
        return `
          background: ${theme.colors.findingBg.blocker};
          color: ${theme.colors.severity.blocker};
        `;
      case 'critical':
        return `
          background: ${theme.colors.findingBg.critical};
          color: ${theme.colors.severity.critical};
        `;
      default:
        return '';
    }
  }}
`;

export const LinkButton = styled.button`
  background: transparent;
  color: ${theme.colors.primary};
  border: none;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  font-size: ${theme.fontSizes.sm};
  font-weight: 600;
  cursor: pointer;
  transition: ${theme.transitions.normal};
  text-decoration: underline;
  white-space: nowrap;

  &:hover {
    color: ${theme.colors.primaryDark};
    transform: none;
    box-shadow: none;
  }
`;

export const RunsListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

export const RunItem = styled.div`
  background: ${theme.colors.cardBg};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.xl};
  box-shadow: ${theme.shadows.sm};
  cursor: pointer;
  transition: ${theme.transitions.normal};

  &:hover {
    transform: translateX(4px);
    box-shadow: ${theme.shadows.md};
  }
`;

export const RunHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
  gap: ${theme.spacing.lg};
`;

export const RunId = styled.span`
  font-family: ${theme.fonts.mono};
  color: ${theme.colors.primary};
  font-weight: 600;
`;

export const RunInfo = styled.div`
  display: flex;
  gap: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.base};
  flex-wrap: wrap;
`;

export const ErrorText = styled.span`
  color: ${theme.colors.error.text};
`;

export const Muted = styled.p`
  color: ${theme.colors.textMuted};
  font-style: italic;
`;

export const PassFailBadge = styled.div<{ passed: boolean }>`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSizes.sm};
  font-weight: 600;
  
  ${props => props.passed ? `
    background: ${theme.colors.success.bg};
    color: ${theme.colors.success.text};
  ` : `
    background: ${theme.colors.error.bg};
    color: ${theme.colors.error.text};
  `}

  &::before {
    content: '${props => props.passed ? '✓' : '✗'}';
    font-size: ${theme.fontSizes.lg};
  }
`;