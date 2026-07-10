import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest } from '../services/api.js';
import { 
  ArrowLeft, Calendar, Eye, Users, Clock, CheckCircle, 
  MapPin, Monitor, Globe, Compass 
} from 'lucide-react';

interface ReportData {
  totalViews: number;
  uniqueVisitors: number;
  averageReadingTime: number; // in seconds
  completionRate: number; // %
  countries: { name: string; value: number }[];
  devices: { name: string; value: number }[];
  os: { name: string; value: number }[];
  referrers: { name: string; value: number }[];
  timeline: { date: string; views: number }[];
}

interface FlipbookMeta {
  title: string;
  pageCount: number;
}

export const Analytics: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  const [report, setReport] = useState<ReportData | null>(null);
  const [flipbookMeta, setFlipbookMeta] = useState<FlipbookMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch flipbook meta
        const metaData = await apiRequest(`/flipbooks/${id}`);
        setFlipbookMeta(metaData.flipbook);

        // Fetch report
        const reportData = await apiRequest(`/analytics/report/${id}`);
        setReport(reportData.report);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch analytics report');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={styles.fullscreenOverlay}>
        <div style={styles.spinner}></div>
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading analytics...</p>
      </div>
    );
  }

  if (error || !report || !flipbookMeta) {
    return (
      <div style={styles.container}>
        <div className="glass-card" style={styles.errorCard}>
          <h3 style={{ color: 'var(--error)', marginBottom: '12px' }}>Failed to Load Analytics</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{error || 'Could not find details for this flipbook.'}</p>
          <Link to="/dashboard" className="glass-btn glass-btn-secondary">
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // SVG Line Chart calculations for daily views timeline
  const renderTimelineChart = () => {
    const data = report.timeline;
    if (data.length === 0) {
      return (
        <div style={styles.chartPlaceholder}>
          <span style={{ color: 'var(--text-muted)' }}>No views recorded yet.</span>
        </div>
      );
    }

    const chartWidth = 500;
    const chartHeight = 200;
    const padding = 20;

    const maxViews = Math.max(...data.map((d) => d.views), 5);
    const stepX = (chartWidth - padding * 2) / Math.max(data.length - 1, 1);
    
    // Build path points
    const points = data.map((d, index) => {
      const x = padding + index * stepX;
      const y = chartHeight - padding - (d.views / maxViews) * (chartHeight - padding * 2);
      return `${x},${y}`;
    }).join(' ');

    const areaPoints = data.length > 0 
      ? `${padding},${chartHeight - padding} ${points} ${padding + (data.length - 1) * stepX},${chartHeight - padding}`
      : '';

    return (
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={styles.svgChart}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="rgba(255,255,255,0.05)" />
        <line x1={padding} y1={chartHeight / 2} x2={chartWidth - padding} y2={chartHeight / 2} stroke="rgba(255,255,255,0.05)" />
        <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="rgba(255,255,255,0.1)" />

        {/* Gradient Area */}
        {areaPoints && <polygon points={areaPoints} fill="url(#chartGrad)" />}

        {/* Glowing path line */}
        {points && <polyline fill="none" stroke="var(--primary)" strokeWidth="3" points={points} />}

        {/* Dots */}
        {data.map((d, index) => {
          const x = padding + index * stepX;
          const y = chartHeight - padding - (d.views / maxViews) * (chartHeight - padding * 2);
          return (
            <g key={index} className="svg-dot-group">
              <circle cx={x} cy={y} r="4" fill="var(--primary-light)" />
              <title>{`${d.date}: ${d.views} views`}</title>
            </g>
          );
        })}
      </svg>
    );
  };

  // SVG Donut Chart calculations for devices
  const renderDeviceChart = () => {
    const devices = report.devices.filter((d) => d.value > 0);
    if (devices.length === 0) {
      return (
        <div style={styles.chartPlaceholder}>
          <span style={{ color: 'var(--text-muted)' }}>No device data.</span>
        </div>
      );
    }

    const totalVal = devices.reduce((acc, d) => acc + d.value, 0);
    const radius = 50;
    const strokeWidth = 12;
    const circ = 2 * Math.PI * radius;
    
    let accumulatedAngle = 0;
    const colors = ['var(--primary)', '#00d2ff', '#a855f7'];

    return (
      <div style={styles.donutContainer}>
        <svg viewBox="0 0 140 140" style={styles.donutSvg}>
          {devices.map((d, index) => {
            const percentage = d.value / totalVal;
            const strokeLength = percentage * circ;
            const strokeOffset = circ - strokeLength + accumulatedAngle;
            accumulatedAngle -= strokeLength;

            return (
              <circle
                key={index}
                cx="70"
                cy="70"
                r={radius}
                fill="transparent"
                stroke={colors[index % colors.length]}
                strokeWidth={strokeWidth}
                strokeDasharray={`${strokeLength} ${circ}`}
                strokeDashoffset={strokeOffset}
                transform="rotate(-90 70 70)"
              />
            );
          })}
        </svg>

        {/* Legend */}
        <div style={styles.donutLegend}>
          {devices.map((d, index) => {
            const pct = Math.round((d.value / totalVal) * 100);
            return (
              <div key={index} style={styles.legendItem}>
                <div style={{ ...styles.legendColor, backgroundColor: colors[index % colors.length] }}></div>
                <span style={styles.legendName}>{d.name}</span>
                <span style={styles.legendPct}>{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Header navbar */}
      <div style={styles.header}>
        <Link to="/dashboard" className="glass-btn glass-btn-secondary" style={styles.backBtn}>
          <ArrowLeft size={16} />
          Back
        </Link>
        <div style={styles.headerTitleWrapper}>
          <h2 style={styles.title}>Analytics Dashboard</h2>
          <span style={styles.subtitle}>{flipbookMeta.title}</span>
        </div>
      </div>

      {/* Top row cards */}
      <div style={styles.metricsGrid}>
        <div className="glass-card" style={styles.metricCard}>
          <div style={styles.metricHeader}>
            <span style={styles.metricLabel}>Total Views</span>
            <Eye size={18} style={{ color: 'var(--primary-light)' }} />
          </div>
          <span style={styles.metricVal}>{report.totalViews}</span>
        </div>

        <div className="glass-card" style={styles.metricCard}>
          <div style={styles.metricHeader}>
            <span style={styles.metricLabel}>Unique Readers</span>
            <Users size={18} style={{ color: '#00d2ff' }} />
          </div>
          <span style={styles.metricVal}>{report.uniqueVisitors}</span>
        </div>

        <div className="glass-card" style={styles.metricCard}>
          <div style={styles.metricHeader}>
            <span style={styles.metricLabel}>Avg. Reading Time</span>
            <Clock size={18} style={{ color: '#a855f7' }} />
          </div>
          <span style={styles.metricVal}>{formatTime(report.averageReadingTime)}</span>
        </div>

        <div className="glass-card" style={styles.metricCard}>
          <div style={styles.metricHeader}>
            <span style={styles.metricLabel}>Completion Rate</span>
            <CheckCircle size={18} style={{ color: '#10b981' }} />
          </div>
          <span style={styles.metricVal}>{report.completionRate}%</span>
        </div>
      </div>

      {/* Charts section */}
      <div style={styles.chartsGrid}>
        {/* Timeline Chart */}
        <div className="glass-card" style={styles.chartCard}>
          <div style={styles.chartHeader}>
            <Calendar size={18} style={{ color: 'var(--primary-light)' }} />
            <h4 style={{ margin: 0 }}>Views Over Time (Timeline)</h4>
          </div>
          <div style={styles.chartBody}>{renderTimelineChart()}</div>
        </div>

        {/* Device Chart */}
        <div className="glass-card" style={styles.chartCard}>
          <div style={styles.chartHeader}>
            <Monitor size={18} style={{ color: '#00d2ff' }} />
            <h4 style={{ margin: 0 }}>Device Distribution</h4>
          </div>
          <div style={styles.chartBody}>{renderDeviceChart()}</div>
        </div>

        {/* Geographics List */}
        <div className="glass-card" style={styles.chartCard}>
          <div style={styles.chartHeader}>
            <Globe size={18} style={{ color: '#10b981' }} />
            <h4 style={{ margin: 0 }}>Geographic Locations (Top 5)</h4>
          </div>
          <div style={styles.listBody}>
            {report.countries.length > 0 ? (
              report.countries.map((c, index) => (
                <div key={index} style={styles.listItem}>
                  <div style={styles.listItemLeft}>
                    <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
                    <span>{c.name}</span>
                  </div>
                  <span style={styles.listItemVal}>{c.value} views</span>
                </div>
              ))
            ) : (
              <div style={styles.emptyState}>No location data recorded yet.</div>
            )}
          </div>
        </div>

        {/* Traffic Sources List */}
        <div className="glass-card" style={styles.chartCard}>
          <div style={styles.chartHeader}>
            <Compass size={18} style={{ color: '#a855f7' }} />
            <h4 style={{ margin: 0 }}>Traffic Referrers</h4>
          </div>
          <div style={styles.listBody}>
            {report.referrers.length > 0 ? (
              report.referrers.map((r, index) => (
                <div key={index} style={styles.listItem}>
                  <div style={styles.listItemLeft}>
                    <Compass size={14} style={{ color: 'var(--text-muted)' }} />
                    <span style={styles.referrerDomain}>{r.name}</span>
                  </div>
                  <span style={styles.listItemVal}>{r.value} sessions</span>
                </div>
              ))
            ) : (
              <div style={styles.emptyState}>No referrer data.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '40px 48px',
    backgroundColor: 'var(--bg-darker)',
    minHeight: '100vh',
    color: 'var(--text-primary)',
  },
  fullscreenOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--bg-darker)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid rgba(255,255,255,0.05)',
    borderTop: '3px solid var(--primary)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorCard: {
    maxWidth: '440px',
    margin: '100px auto 0 auto',
    padding: '40px',
    textAlign: 'center',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    marginBottom: '40px',
  },
  backBtn: {
    padding: '8px 16px',
    fontSize: '0.85rem',
  },
  headerTitleWrapper: {
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    fontSize: '1.6rem',
    margin: 0,
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
    marginTop: '4px',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '24px',
    marginBottom: '40px',
  },
  metricCard: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  metricHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  metricVal: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#ffffff',
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '32px',
  },
  chartCard: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  chartHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '12px',
  },
  chartBody: {
    height: '200px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartPlaceholder: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  svgChart: {
    width: '100%',
    height: '100%',
    overflow: 'visible',
  },
  donutContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    gap: '16px',
  },
  donutSvg: {
    width: '130px',
    height: '130px',
  },
  donutLegend: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '0.85rem',
  },
  legendColor: {
    width: '12px',
    height: '12px',
    borderRadius: '3px',
  },
  legendName: {
    color: 'var(--text-secondary)',
    textTransform: 'capitalize',
    width: '70px',
  },
  legendPct: {
    color: '#ffffff',
    fontWeight: '600',
  },
  listBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
  },
  listItemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '0.9rem',
  },
  listItemVal: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#ffffff',
  },
  emptyState: {
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    padding: '40px 0',
  },
  referrerDomain: {
    maxWidth: '220px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};
