import React, { useState, useEffect } from 'react';

export default function Dashboard({ apiUrl }) {
  const [constituencies, setConstituencies] = useState([]);
  const [selectedConstId, setSelectedConstId] = useState('');
  const [booths, setBooths] = useState([]);
  const [constName, setConstName] = useState('');
  
  // Search & Sorting state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('booth_number');
  const [sortDirection, setSortDirection] = useState('asc');

  // Loading & Error states
  const [isLoadingConsts, setIsLoadingConsts] = useState(true);
  const [isLoadingBooths, setIsLoadingBooths] = useState(false);
  const [error, setError] = useState('');

  // Fetch constituencies on mount
  useEffect(() => {
    const fetchConstituencies = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/constituencies`);
        if (!res.ok) throw new Error('Failed to load constituencies.');
        const data = await res.json();
        setConstituencies(data);
        if (data.length > 0) {
          setSelectedConstId(data[0].id);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoadingConsts(false);
      }
    };
    fetchConstituencies();
  }, [apiUrl]);

  // Fetch booths when selected constituency changes
  useEffect(() => {
    if (!selectedConstId) return;

    const fetchBooths = async () => {
      setIsLoadingBooths(true);
      setError('');
      try {
        const res = await fetch(`${apiUrl}/api/constituencies/${selectedConstId}/booths`);
        if (!res.ok) throw new Error('Failed to load booth-level data.');
        const data = await res.json();
        setBooths(data.booths);
        setConstName(data.constituency_name);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoadingBooths(false);
      }
    };
    fetchBooths();
  }, [selectedConstId, apiUrl]);

  // Selected constituency aggregate stats
  const selectedConstData = constituencies.find(c => c.id === Number(selectedConstId));

  // Filter booths by search query
  const filteredBooths = booths.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.booth_number.toString().includes(searchQuery)
  );

  // Sorting handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort booths
  const sortedBooths = [...filteredBooths].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === 'leading_candidate') {
      valA = a.leading_candidate ? a.leading_candidate.name : '';
      valB = b.leading_candidate ? b.leading_candidate.name : '';
    }

    if (typeof valA === 'string') {
      return sortDirection === 'asc' 
        ? valA.localeCompare(valB) 
        : valB.localeCompare(valA);
    } else {
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    }
  });

  // Calculate party colors
  const getPartyClass = (party) => {
    if (!party) return '';
    if (party.includes('PRG')) return 'party-prg';
    if (party.includes('CON')) return 'party-con';
    if (party.includes('LIB')) return 'party-lib';
    return 'party-ind';
  };

  const getPartyColor = (party) => {
    if (!party) return '#94a3b8';
    if (party.includes('PRG')) return '#3b82f6'; // blue
    if (party.includes('CON')) return '#10b981'; // green
    if (party.includes('LIB')) return '#8b5cf6'; // purple
    return '#f97316'; // orange/independent
  };

  // Prepare data for candidate bar chart (Aggregated votes across all booths in selected constituency)
  const candidateVotesAggregate = {};
  booths.forEach(b => {
    b.votes.forEach(v => {
      candidateVotesAggregate[v.name] = (candidateVotesAggregate[v.name] || 0) + v.votes;
    });
  });

  const chartCandidates = Object.keys(candidateVotesAggregate).map(name => {
    const candidateInfo = booths[0]?.votes.find(v => v.name === name);
    return {
      name,
      party: candidateInfo ? candidateInfo.party : 'Unknown',
      votes: candidateVotesAggregate[name]
    };
  }).sort((a, b) => b.votes - a.votes);

  const maxVotes = Math.max(...chartCandidates.map(c => c.votes), 1);

  // Donut chart calculations
  const totalVotesPolled = selectedConstData?.turnout_votes || 0;
  const totalVoters = selectedConstData?.total_voters || 0;
  const turnoutPercentage = selectedConstData?.turnout_percentage || 0;
  const unpolledVotes = Math.max(0, totalVoters - totalVotesPolled);

  // SVG pie/donut calculation helper
  const getDonutSegments = () => {
    if (totalVoters === 0) return [];
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    
    const polledShare = totalVotesPolled / totalVoters;
    const polledOffset = circumference;
    const polledStrokeDash = polledShare * circumference;

    const unpolledStrokeDash = (1 - polledShare) * circumference;
    const unpolledOffset = circumference - polledStrokeDash;

    return [
      { strokeDash: `${polledStrokeDash} ${circumference}`, offset: 0, color: '#10b981', label: 'Votes Polled' },
      { strokeDash: `${unpolledStrokeDash} ${circumference}`, offset: -polledStrokeDash, color: '#1e293b', label: 'Did Not Vote' }
    ];
  };

  if (isLoadingConsts) {
    return <div className="spinner"></div>;
  }

  return (
    <div>
      {/* Top Filter & Search Bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <label className="filter-label" htmlFor="constituency-select">Constituency</label>
          <select 
            id="constituency-select" 
            className="select-control"
            value={selectedConstId} 
            onChange={(e) => setSelectedConstId(e.target.value)}
          >
            {constituencies.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.state})</option>
            ))}
          </select>
        </div>

        <div className="search-control-container">
          <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="text" 
            className="search-input" 
            placeholder="Search booth name, area, or number..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="toast">{error}</div>}

      {/* Aggregate metrics grid */}
      {selectedConstData && (
        <div className="metrics-grid">
          <div className="metric-card blue">
            <span className="metric-title">Total Booths</span>
            <span className="metric-value">{selectedConstData.total_booths}</span>
            <span className="metric-desc">Polling stations registered</span>
          </div>
          <div className="metric-card cyan">
            <span className="metric-title">Registered Voters</span>
            <span className="metric-value">{selectedConstData.total_voters.toLocaleString()}</span>
            <span className="metric-desc">Eligible electorate size</span>
          </div>
          <div className="metric-card green">
            <span className="metric-title">Voter Turnout</span>
            <span className="metric-value">
              {turnoutPercentage}%
            </span>
            <span className="metric-desc">
              {selectedConstData.turnout_votes.toLocaleString()} votes cast
            </span>
          </div>
          <div className="metric-card purple">
            <span className="metric-title">Leading Candidate</span>
            <span className="metric-value" style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', height: '2.8rem' }}>
              {selectedConstData.leading_candidate ? selectedConstData.leading_candidate.name : 'N/A'}
            </span>
            <span className="metric-desc">
              {selectedConstData.leading_candidate ? (
                <>
                  <span className={`metric-badge ${getPartyClass(selectedConstData.leading_candidate.party)}`}>
                    {selectedConstData.leading_candidate.party.split(' ')[0]}
                  </span>
                  <span style={{ marginLeft: '0.5rem' }}>
                    ({selectedConstData.leading_candidate.votes.toLocaleString()} votes)
                  </span>
                </>
              ) : 'No votes recorded'}
            </span>
          </div>
        </div>
      )}

      {/* Main dashboard content */}
      <div className="dashboard-grid">
        {/* Booth Table panel */}
        <div className="card-panel">
          <div className="panel-header">
            <h2 className="panel-title">Booth-wise Election Turnout & Results</h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing {filteredBooths.length} of {booths.length} booths
            </span>
          </div>

          {isLoadingBooths ? (
            <div className="spinner"></div>
          ) : booths.length === 0 ? (
            <div className="empty-state">No booths found for this constituency.</div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th className="sortable" onClick={() => handleSort('booth_number')}>
                      No. {sortField === 'booth_number' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="sortable" onClick={() => handleSort('name')}>
                      Booth / Polling Location {sortField === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="sortable" onClick={() => handleSort('total_voters')}>
                      Voters {sortField === 'total_voters' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="sortable" onClick={() => handleSort('turnout_percentage')}>
                      Turnout {sortField === 'turnout_percentage' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="sortable" onClick={() => handleSort('leading_candidate')}>
                      Leading Candidate {sortField === 'leading_candidate' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBooths.map(b => (
                    <tr key={b.id}>
                      <td>
                        <span className="booth-number-badge">{b.booth_number}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{b.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.location}</div>
                      </td>
                      <td>{b.total_voters.toLocaleString()}</td>
                      <td>
                        <div className="text-highlight-green">{b.turnout_percentage}%</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.turnout_votes.toLocaleString()} polled</div>
                        <div className="turnout-bar-container">
                          <div 
                            className="turnout-bar" 
                            style={{ 
                              width: `${b.turnout_percentage}%`, 
                              backgroundColor: b.turnout_percentage > 75 ? 'var(--accent-green)' : b.turnout_percentage > 60 ? 'var(--accent-blue)' : 'var(--accent-orange)' 
                            }}
                          ></div>
                        </div>
                      </td>
                      <td>
                        {b.leading_candidate ? (
                          <div>
                            <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{b.leading_candidate.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                              <span className={`brand-badge ${getPartyClass(b.leading_candidate.party)}`} style={{ fontSize: '0.65rem', padding: '0.05rem 0.25rem' }}>
                                {b.leading_candidate.party.split('(')[1]?.replace(')', '') || b.leading_candidate.party}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {b.leading_candidate.votes.toLocaleString()} votes
                              </span>
                            </div>
                          </div>
                        ) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Visual Charts panel */}
        <div className="card-panel">
          <h2 className="panel-title" style={{ marginBottom: '1.5rem' }}>Constituency Metrics Visualization</h2>

          {isLoadingBooths ? (
            <div className="spinner"></div>
          ) : booths.length === 0 ? (
            <div className="empty-state">Select a constituency to view visualizations.</div>
          ) : (
            <div className="charts-stack">
              {/* Candidate Votes Bar Chart */}
              <div className="chart-wrapper">
                <span className="chart-title">Aggregate Candidate Votes</span>
                <svg className="svg-chart" width="400" height="220" viewBox="0 0 400 220">
                  {/* Grid lines */}
                  <line x1="80" y1="180" x2="380" y2="180" stroke="var(--border-color)" strokeWidth="1" />
                  <line x1="80" y1="130" x2="380" y2="130" stroke="rgba(34, 48, 73, 0.3)" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="80" y1="80" x2="380" y2="80" stroke="rgba(34, 48, 73, 0.3)" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="80" y1="30" x2="380" y2="30" stroke="rgba(34, 48, 73, 0.3)" strokeWidth="1" strokeDasharray="3,3" />
                  
                  {chartCandidates.map((cand, idx) => {
                    const barHeight = (cand.votes / maxVotes) * 140;
                    const x = 95 + idx * 75;
                    const y = 180 - barHeight;
                    const color = getPartyColor(cand.party);
                    
                    return (
                      <g key={cand.name}>
                        {/* Bar */}
                        <rect
                          className="bar-hoverable"
                          x={x}
                          y={y}
                          width="40"
                          height={barHeight}
                          fill={color}
                          rx="4"
                        />
                        {/* Vote Label on top of bar */}
                        <text
                          x={x + 20}
                          y={y - 8}
                          textAnchor="middle"
                          fill="var(--text-primary)"
                          fontSize="10"
                          fontWeight="600"
                        >
                          {cand.votes >= 1000 ? `${(cand.votes / 1000).toFixed(1)}k` : cand.votes}
                        </text>
                        {/* Candidate name label below chart */}
                        <text
                          x={x + 20}
                          y="198"
                          textAnchor="middle"
                          fill="var(--text-secondary)"
                          fontSize="9"
                          fontWeight="500"
                        >
                          {cand.name.split(' ')[0]}
                        </text>
                        {/* Party label */}
                        <text
                          x={x + 20}
                          y="212"
                          textAnchor="middle"
                          fill={color}
                          fontSize="8"
                          fontWeight="700"
                        >
                          {cand.party.split('(')[1]?.replace(')', '') || cand.party}
                        </text>
                      </g>
                    );
                  })}
                  {/* Y Axis text */}
                  <text x="35" y="34" fill="var(--text-muted)" fontSize="9" fontWeight="500">Max</text>
                  <text x="35" y="105" fill="var(--text-muted)" fontSize="9" fontWeight="500">50%</text>
                  <text x="35" y="180" fill="var(--text-muted)" fontSize="9" fontWeight="500">0</text>
                </svg>
              </div>

              <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)' }} />

              {/* Turnout Donut Chart */}
              <div className="chart-wrapper">
                <span className="chart-title">Overall Turnout ({turnoutPercentage}%)</span>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <svg className="svg-chart" width="160" height="160" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="transparent" stroke="var(--border-color)" strokeWidth="10" />
                    {getDonutSegments().map((segment, idx) => (
                      <circle
                        key={idx}
                        className="pie-slice"
                        cx="60"
                        cy="60"
                        r="50"
                        fill="transparent"
                        stroke={segment.color}
                        strokeWidth="12"
                        strokeDasharray={segment.strokeDash}
                        strokeDashoffset={segment.offset}
                        transform="rotate(-90 60 60)"
                      />
                    ))}
                    {/* Centered Stats text */}
                    <text x="60" y="55" textAnchor="middle" fill="var(--text-primary)" fontSize="14" fontWeight="700" fontFamily="var(--font-display)">
                      {turnoutPercentage}%
                    </text>
                    <text x="60" y="70" textAnchor="middle" fill="var(--text-muted)" fontSize="8" fontWeight="600" letterSpacing="0.5px">
                      TURNOUT
                    </text>
                  </svg>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'var(--accent-green)' }}></span>
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-primary)' }}>Votes Polled</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{totalVotesPolled.toLocaleString()} ({turnoutPercentage}%)</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'var(--border-color)' }}></span>
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-primary)' }}>Did Not Vote</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{unpolledVotes.toLocaleString()} ({(100 - turnoutPercentage).toFixed(2)}%)</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
