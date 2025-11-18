import styled from '@emotion/styled';
import { theme } from '../styles/theme';

export const RunDetailContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xl};
`;

export const BackButton = styled.button`
  background: transparent;
  border: none;
  color: ${theme.colors.primary};
  font-size: ${theme.fontSizes.base};
  cursor: pointer;
  padding: ${theme.spacing.sm};
  margin-left: -${theme.spacing.sm};
  margin-bottom: ${theme.spacing.md};
  transition: ${theme.transitions.normal};
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};

  &:hover {
    color: ${theme.colors.primaryDark};
    transform: translateX(-4px);
  }
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
        background: ${theme.colors.event.screenshot.bg};
        color: ${theme.colors.event.screenshot.text};
      `;
    }
    if (props.type === 'status') {
      return `
        background: ${theme.colors.badge.model.bg};
        color: ${theme.colors.badge.model.text};
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
`;

export const ThumbnailImage = styled.img<{ active: boolean }>`
  width: 120px;
  height: auto;
  border-radius: ${theme.borderRadius.sm};
  cursor: pointer;
  opacity: ${props => props.active ? 1 : 0.6};
  transition: ${theme.transitions.normal};
  border: 2px solid ${props => props.active ? theme.colors.primary : 'transparent'};

  &:hover {
    opacity: 0.8;
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
        return theme.colors.severity.critical;
      case 'high':
      case 'major':
        return theme.colors.severity.major;
      case 'medium':
        return theme.colors.severity.major;
      case 'low':
      case 'minor':
        return theme.colors.severity.minor;
      case 'info':
        return theme.colors.severity.info;
      default:
        return theme.colors.textSecondary;
    }
  }};
  color: white;
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
        return `border-left-color: ${theme.colors.severity.blocker}; background: ${theme.colors.findingBg.blocker};`;
      case 'critical':
        return `border-left-color: ${theme.colors.severity.critical}; background: ${theme.colors.findingBg.critical};`;
      case 'major':
        return `border-left-color: ${theme.colors.severity.major}; background: ${theme.colors.findingBg.major};`;
      case 'minor':
        return `border-left-color: ${theme.colors.severity.minor}; background: ${theme.colors.findingBg.minor};`;
      case 'info':
        return `border-left-color: ${theme.colors.severity.info}; background: ${theme.colors.findingBg.info};`;
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

export const DismissActions = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  align-items: center;
  margin-left: auto;
`;

export const DismissButton = styled.button`
  background: ${theme.colors.borderLight};
  color: ${theme.colors.textSecondary};
  border: 1px solid ${theme.colors.border};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;
  transition: ${theme.transitions.normal};
  font-weight: 500;

  &:hover {
    background: ${theme.colors.primary};
    color: white;
    border-color: ${theme.colors.primary};
  }
`;

export const DismissMenu = styled.div`
  position: relative;
  display: inline-block;
`;

export const DismissDropdown = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: ${theme.spacing.xs};
  background: white;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.lg};
  z-index: 100;
  min-width: 200px;
  overflow: hidden;
`;

export const DismissOption = styled.button`
  width: 100%;
  padding: ${theme.spacing.md};
  border: none;
  background: white;
  text-align: left;
  cursor: pointer;
  transition: ${theme.transitions.fast};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};

  &:hover {
    background: ${theme.colors.background};
  }

  &:not(:last-child) {
    border-bottom: 1px solid ${theme.colors.borderLight};
  }

  strong {
    font-weight: 600;
    color: ${theme.colors.primary};
  }

  span {
    font-size: ${theme.fontSizes.xs};
    color: ${theme.colors.textSecondary};
  }
`;

export const DismissedBadge = styled.div<{ reason: string }>`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSizes.sm};
  font-weight: 600;
  background: ${props => props.reason === 'fixed' 
    ? theme.colors.success.bg 
    : theme.colors.borderLight};
  color: ${props => props.reason === 'fixed'
    ? theme.colors.success.text
    : theme.colors.textSecondary};
`;

export const RestoreButton = styled.button`
  background: transparent;
  color: ${theme.colors.primary};
  border: 1px solid ${theme.colors.primary};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;
  transition: ${theme.transitions.normal};
  font-weight: 500;

  &:hover {
    background: ${theme.colors.primary};
    color: white;
  }
`;

export const DismissedFinding = styled(Finding)<{ severity?: string }>`
  opacity: 0.7;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 10px,
      rgba(255, 255, 255, 0.5) 10px,
      rgba(255, 255, 255, 0.5) 20px
    );
    pointer-events: none;
  }
`;
