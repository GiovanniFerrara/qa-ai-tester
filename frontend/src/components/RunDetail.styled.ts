import styled from '@emotion/styled';
import { theme } from '../styles/theme';

export const RunDetailContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xl};
`;

export const RunDetailHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: ${theme.spacing.lg};
  flex-wrap: wrap;

  > div:first-of-type {
    h2 {
      margin-bottom: ${theme.spacing.sm};
      color: ${theme.colors.primary};
    }

    p {
      color: ${theme.colors.textSecondary};
      font-family: ${theme.fonts.mono};
    }
  }
`;

export const RunDetailMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.lg};
  flex-wrap: wrap;
`;

export const RunTimes = styled.div`
  display: flex;
  gap: ${theme.spacing.xl};
  flex-wrap: wrap;
  margin-top: ${theme.spacing.lg};
  padding-top: ${theme.spacing.lg};
  border-top: 1px solid ${theme.colors.border};
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};

  strong {
    color: ${theme.colors.text};
  }
`;

export const RunLiveGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: ${theme.spacing.xl};
`;

export const EventsFeed = styled.div`
  max-height: 600px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

export const EventItem = styled.div`
  padding: ${theme.spacing.md};
  background: ${theme.colors.background};
  border-radius: ${theme.borderRadius.md};
  border-left: 3px solid ${theme.colors.primary};
`;

export const EventMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
`;

export const EventTime = styled.span`
  color: ${theme.colors.textMuted};
  font-family: ${theme.fonts.mono};
`;

export const EventType = styled.span<{ type?: string }>`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.md};
  font-weight: 600;
  text-transform: uppercase;
  font-size: ${theme.fontSizes.xs};
  
  ${props => {
    if (props.type === 'screenshot') {
      return `
        background: #e3f2fd;
        color: #1976d2;
      `;
    }
    if (props.type === 'status') {
      return `
        background: #f3e5f5;
        color: #7b1fa2;
      `;
    }
    return `
      background: ${theme.colors.borderLight};
      color: ${theme.colors.textSecondary};
    `;
  }}
`;

export const EventMessage = styled.div`
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.base};
`;

export const EventPayload = styled.pre`
  background: ${theme.colors.borderLight};
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  overflow-x: auto;
  font-size: ${theme.fontSizes.sm};
  margin-top: ${theme.spacing.sm};
  color: ${theme.colors.text};
  font-family: ${theme.fonts.mono};
`;

export const ScreenshotFrame = styled.div`
  border-radius: ${theme.borderRadius.md};
  overflow: hidden;
  background: ${theme.colors.borderLight};
  margin-bottom: ${theme.spacing.md};

  img {
    width: 100%;
    height: auto;
    display: block;
  }
`;

export const ScreenshotMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${theme.spacing.md};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
  margin-bottom: ${theme.spacing.md};
`;

export const ScreenshotStrip = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  overflow-x: auto;

  img {
    width: 100px;
    height: auto;
    border-radius: ${theme.borderRadius.sm};
    cursor: pointer;
    transition: ${theme.transitions.normal};

    &:hover {
      transform: scale(1.05);
    }
  }
`;

export const SlideshowContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

export const SlideshowControls = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
`;

export const SlideshowBtn = styled.button`
  background: ${theme.colors.primary};
  color: white;
  border: none;
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSizes.lg};
  cursor: pointer;
  transition: ${theme.transitions.normal};

  &:hover {
    background: ${theme.colors.primaryDark};
    transform: translateY(-2px);
    box-shadow: ${theme.shadows.md};
  }
`;

export const SlideshowCounter = styled.span`
  margin-left: auto;
  color: ${theme.colors.textSecondary};
  font-family: ${theme.fonts.mono};
`;

export const SlideshowFrame = styled.div`
  border-radius: ${theme.borderRadius.lg};
  overflow: hidden;
  background: ${theme.colors.borderLight};

  img {
    width: 100%;
    height: auto;
    display: block;
  }
`;

export const SlideshowThumbnails = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  overflow-x: auto;
  padding: ${theme.spacing.sm} 0;

  img {
    width: 120px;
    height: auto;
    border-radius: ${theme.borderRadius.sm};
    cursor: pointer;
    opacity: 0.6;
    transition: ${theme.transitions.normal};
    border: 2px solid transparent;

    &:hover {
      opacity: 0.8;
    }

    &.active {
      opacity: 1;
      border-color: ${theme.colors.primary};
    }
  }
`;

export const ReportSummary = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: ${theme.spacing.xl};
  margin-bottom: ${theme.spacing.xl};
  flex-wrap: wrap;

  > div {
    p {
      margin: ${theme.spacing.sm} 0;
    }
  }
`;

export const SummaryValue = styled.div`
  font-size: ${theme.fontSizes['3xl']};
  font-weight: bold;
  color: ${theme.colors.primary};
  margin-bottom: ${theme.spacing.sm};
`;

export const SummaryLabel = styled.div`
  font-size: ${theme.fontSizes.base};
  color: ${theme.colors.textSecondary};
`;

export const ReportSummaryText = styled.div`
  padding: ${theme.spacing.lg};
  background: ${theme.colors.background};
  border-radius: ${theme.borderRadius.md};
  margin: ${theme.spacing.xl} 0;
  line-height: 1.6;

  strong {
    color: ${theme.colors.primary};
  }
`;
export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: ${theme.spacing.lg};
  margin: ${theme.spacing.xl} 0;
`;

export const SummaryCard = styled.div`
  background: ${theme.colors.background};
  padding: ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.md};
  text-align: center;
  border: 1px solid ${theme.colors.border};
`;


export const SeverityBreakdown = styled.div`
  margin-top: ${theme.spacing.xl};

  h3 {
    margin-bottom: ${theme.spacing.lg};
    color: ${theme.colors.text};
  }
`;

export const SeverityItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.md};
  background: ${theme.colors.background};
  border-radius: ${theme.borderRadius.md};
  margin-bottom: ${theme.spacing.sm};

  > span:last-child {
    font-weight: 600;
    font-size: ${theme.fontSizes.lg};
  }
`;

export const SeverityBadge = styled.span<{ severity: string }>`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.sm};
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${({ severity }) => {
    switch (severity.toLowerCase()) {
      case 'critical':
      case 'blocker':
        return '#dc2626';
      case 'high':
      case 'major':
        return '#ea580c';
      case 'medium':
        return '#f59e0b';
      case 'low':
      case 'minor':
        return '#10b981';
      case 'info':
        return '#64748b';
      default:
        return theme.colors.textSecondary;
    }
  }};
  color: white;
`;

export const KpiTable = styled.div`
  overflow-x: auto;
`;

export const KpiTableHeader = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 120px;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: ${theme.colors.primary};
  color: white;
  font-weight: 600;
  border-radius: ${theme.borderRadius.md} ${theme.borderRadius.md} 0 0;
`;

export const KpiTableRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 120px;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.border};
  align-items: center;

  &:last-child {
    border-bottom: none;
  }
`;

export const KpiLabel = styled.div`
  font-weight: 600;
  color: ${theme.colors.text};
`;

export const KpiExpected = styled.div`
  color: ${theme.colors.text};
  font-family: ${theme.fonts.mono};
  font-size: ${theme.fontSizes.sm};
`;

export const KpiObserved = styled.div`
  color: ${theme.colors.text};
  font-family: ${theme.fonts.mono};
  font-size: ${theme.fontSizes.sm};
`;

export const KpiStatus = styled.span<{ status?: string }>`
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  font-weight: 600;
  font-size: ${theme.fontSizes.sm};
  display: inline-block;
  
  ${props => {
    if (props.status === 'ok') {
      return `
        background: ${theme.colors.success.bg};
        color: ${theme.colors.success.text};
      `;
    }
    if (props.status === 'mismatch') {
      return `
        background: ${theme.colors.error.bg};
        color: ${theme.colors.error.text};
      `;
    }
    return `
      background: ${theme.colors.borderLight};
      color: ${theme.colors.textSecondary};
    `;
  }}
`;

export const Finding = styled.div<{ severity?: string }>`
  background: white;
  border-left: 4px solid;
  padding: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.md};
  
  ${props => {
    switch (props.severity) {
      case 'blocker':
        return `border-left-color: #b91c1c; background: #fee2e2;`;
      case 'critical':
        return `border-left-color: #dc2626; background: #fee2e2;`;
      case 'major':
        return `border-left-color: #f97316; background: #fff4e6;`;
      case 'minor':
        return `border-left-color: #0d9488; background: #e6fffa;`;
      case 'info':
        return `border-left-color: #64748b; background: #f1f5f9;`;
      default:
        return `border-left-color: ${theme.colors.border};`;
    }
  }}
`;

export const FindingHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.md};
`;

export const FindingTitle = styled.div`
  font-size: ${theme.fontSizes.lg};
  font-weight: 600;
  color: ${theme.colors.text};
  flex: 1;
`;

export const FindingBody = styled.div`
  margin: ${theme.spacing.md} 0;

  p {
    margin: ${theme.spacing.sm} 0;
    line-height: 1.6;

    strong {
      color: ${theme.colors.primary};
    }
  }
`;

export const FindingEvidence = styled.div`
  margin-top: ${theme.spacing.lg};

  > strong {
    display: block;
    margin-bottom: ${theme.spacing.md};
    color: ${theme.colors.text};
  }
`;

export const EvidenceGallery = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${theme.spacing.md};
`;

export const EvidenceItem = styled.div`
  position: relative;
  cursor: pointer;
  border-radius: ${theme.borderRadius.md};
  overflow: hidden;
  transition: ${theme.transitions.normal};

  &:hover {
    transform: scale(1.05);
    box-shadow: ${theme.shadows.lg};
  }

  img {
    width: 100%;
    height: auto;
    display: block;
  }
`;

export const EvidenceInfo = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.xs};
  text-align: center;
`;

export const FindingMeta = styled.div`
  display: flex;
  gap: ${theme.spacing.lg};
  margin-top: ${theme.spacing.md};
  padding-top: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.border};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  flex-wrap: wrap;
`;

export const EvidenceModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  cursor: pointer;
`;

export const EvidenceModalContent = styled.div`
  position: relative;
  max-width: 90vw;
  max-height: 90vh;

  img {
    max-width: 100%;
    max-height: 90vh;
    object-fit: contain;
  }
`;

export const EvidenceModalClose = styled.button`
  position: absolute;
  top: -40px;
  right: 0;
  background: white;
  color: ${theme.colors.text};
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: ${theme.transitions.normal};

  &:hover {
    background: ${theme.colors.error.bg};
    color: ${theme.colors.error.text};
    transform: scale(1.1);
  }
`;