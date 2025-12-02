import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, AreaChart, Area, Tooltip, Legend } from 'recharts';

export interface ChartDataPoint {
  time: string | number;
  value?: number;
  [key: string]: any;
}

export interface ChartConfig {
  width: number;
  height: number;
  data: ChartDataPoint[];
  title?: string;
  subtitle?: string;
  color?: string;
  multiLine?: boolean;
  type?: 'line' | 'bar' | 'area';
  yAxisLabel?: string;
  xAxisLabel?: string;
  sensorKey?: string;
  unidad?: string;
}

// Color palette for time slots - vibrant and distinct colors
const timeSlotColors = [
  '#ff7300', // Orange - 12am-6am
  '#8884d8', // Purple - 6am-12pm
  '#82ca9d', // Green - 12pm-6pm
  '#ffc658', // Yellow - 6pm-12am
];

// Soft color palette for clean, professional charts
const colorPalette = [
  '#6b7280', // Gray
  '#374151', // Dark Gray
  '#4b5563', // Medium Gray
  '#9ca3af', // Light Gray
  '#6b7280', // Gray (repeated for consistency)
  '#374151', // Dark Gray (repeated)
  '#4b5563', // Medium Gray (repeated)
  '#9ca3af', // Light Gray (repeated)
  '#6b7280', // Gray (repeated)
  '#374151'  // Dark Gray (repeated)
];

// Format time labels to show only date (no time)
const formatTimeLabel = (value: string | number, _data: any[]) => {
  if (!value) return '';
  const date = new Date(value);

  // Show only date for cleaner charts
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric'
  });
};

// Calculate smart Y-axis domain based on data
const calculateYAxisDomain = (data: ChartDataPoint[], dataKeys: string[]) => {
  let minValue = Infinity;
  let maxValue = -Infinity;

  data.forEach(point => {
    dataKeys.forEach(key => {
      const value = point[key];
      if (typeof value === 'number' && !isNaN(value)) {
        minValue = Math.min(minValue, value);
        maxValue = Math.max(maxValue, value);
      }
    });
  });

  if (minValue === Infinity || maxValue === -Infinity) {
    return [0, 100]; // Default range
  }

  // Calculate range and nice intervals
  const range = maxValue - minValue;
  const padding = range * 0.1; // 10% padding

  let niceMin = Math.floor((minValue - padding) / 5) * 5;
  let niceMax = Math.ceil((maxValue + padding) / 5) * 5;

  // Ensure minimum range
  if (niceMax - niceMin < 10) {
    const center = (niceMin + niceMax) / 2;
    niceMin = center - 5;
    niceMax = center + 5;
  }

  return [niceMin, niceMax];
};

// Custom tooltip component
const CustomTooltip = ({ active, payload, label, unidad }: any) => {
  if (active && payload && payload.length) {
    const date = new Date(label);
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-800 mb-2">
          {date.toLocaleDateString([], {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            <span className="font-medium">{entry.dataKey}:</span> {entry.value?.toFixed(2)} {unidad || ''}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const renderLineChartToCanvas = async (config: ChartConfig): Promise<HTMLCanvasElement> => {
  const { 
    width, 
    height, 
    data, 
    title, 
    subtitle,
    multiLine = false, 
    type = 'line',
    yAxisLabel,
    sensorKey,
    unidad = ''
  } = config;

  // Validate data
  if (!data || data.length === 0) {
    throw new Error('No data provided for chart');
  }

  // Create a container div with enhanced styling
  const container = document.createElement('div');
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.backgroundColor = '#ffffff';
  container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  container.style.padding = '8px';
  document.body.appendChild(container);

  // Get data keys for lines
  const dataKeys = multiLine ? Object.keys(data[0] || {}).filter(key => key !== 'time') : ['value'];

  // Calculate Y-axis domain
  const yAxisDomain = calculateYAxisDomain(data, dataKeys);

  // Use sensor key as the line name if provided
  const getLineName = (key: string) => {
    if (sensorKey && key === 'value') return `Sensor ${sensorKey}`;
    return key.charAt(0).toUpperCase() + key.slice(1);
  };

  // Get color for line based on time slot
  const getLineColor = (key: string, index: number) => {
    if (multiLine) {
      // Use time slot colors for specific keys
      if (key === '12am-6am') return timeSlotColors[0];
      if (key === '6am-12pm') return timeSlotColors[1];
      if (key === '12pm-6pm') return timeSlotColors[2];
      if (key === '6pm-12am') return timeSlotColors[3];
    }
    return colorPalette[index % colorPalette.length];
  };

  // Calculate optimal chart dimensions
  const chartHeight = height - 80; // Reserve space for title and subtitle

  // Create the enhanced chart content
  const chartContent = (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '8px'
    }}>
      {/* Enhanced Header */}
      {(title || subtitle) && (
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '8px',
          borderBottom: '1px solid #f3f4f6',
          paddingBottom: '8px'
        }}>
          {title && (
            <h3 style={{
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#111827',
              margin: '0 0 4px 0',
              lineHeight: '1.2'
            }}>
              {title}
            </h3>
          )}
          {subtitle && (
            <p style={{
              fontSize: '11px',
              color: '#6b7280',
              margin: 0,
              fontWeight: 'normal'
            }}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      
      <ResponsiveContainer width="100%" height={chartHeight}>
        {type === 'bar' ? (
          <BarChart 
            data={data} 
            margin={{ top: 10, right: 20, left: 15, bottom: 15 }}
            barCategoryGap="20%"
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#f3f4f6"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ 
                fontSize: 10, 
                fill: '#6b7280',
                fontWeight: 500
              }}
              tickFormatter={(value) => formatTimeLabel(value, data)}
              angle={-45}
              textAnchor="end"
              height={50}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 500 }}
              domain={yAxisDomain}
              label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: '10px', fill: '#6b7280' } } : undefined}
            />
            <Tooltip content={<CustomTooltip unidad={unidad} />} />
            {dataKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colorPalette[index % colorPalette.length]}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        ) : type === 'area' ? (
          <AreaChart 
            data={data} 
            margin={{ top: 10, right: 20, left: 15, bottom: 15 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#f3f4f6"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ 
                fontSize: 10, 
                fill: '#6b7280',
                fontWeight: 500
              }}
              tickFormatter={(value) => formatTimeLabel(value, data)}
              angle={-45}
              textAnchor="end"
              height={50}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 500 }}
              domain={yAxisDomain}
              label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: '10px', fill: '#6b7280' } } : undefined}
            />
            <Tooltip content={<CustomTooltip unidad={unidad} />} />
            {dataKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colorPalette[index % colorPalette.length]}
                fill={colorPalette[index % colorPalette.length]}
                fillOpacity={0.2}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        ) : (
          <LineChart 
            data={data} 
            margin={{ top: 10, right: 20, left: 15, bottom: 15 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#f3f4f6"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ 
                fontSize: 10, 
                fill: '#6b7280',
                fontWeight: 500
              }}
              tickFormatter={(value) => formatTimeLabel(value, data)}
              angle={-45}
              textAnchor="end"
              height={50}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 500 }}
              domain={yAxisDomain}
              label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: '10px', fill: '#6b7280' } } : undefined}
            />
            <Tooltip content={<CustomTooltip unidad={unidad} />} />
            {dataKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={getLineColor(key, index)}
                strokeWidth={2}
                dot={false} // Sin puntos marcados
                activeDot={false}
                name={getLineName(key)}
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );

  // Render the React component
  const root = createRoot(container);
  root.render(chartContent);

  // Wait for render
  await new Promise(resolve => setTimeout(resolve, 1500));

  try {
    // Use html2canvas to capture the chart with enhanced settings
    const canvas = await html2canvas(container, {
      width: width,
      height: height,
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      logging: false,
      onclone: (clonedDoc) => {
        // Ensure fonts are loaded
        const style = clonedDoc.createElement('style');
        style.textContent = `
          * {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
          }
        `;
        clonedDoc.head.appendChild(style);
      }
    });

    return canvas;
  } finally {
    // Clean up
    root.unmount();
    document.body.removeChild(container);
  }
};

export const renderBarChartToCanvas = async (config: ChartConfig): Promise<HTMLCanvasElement> => {
  const { 
    width, 
    height, 
    data, 
    title, 
    subtitle,
    color = '#2563eb',
    yAxisLabel,
    unidad = ''
  } = config;

  // Validate data
  if (!data || data.length === 0) {
    throw new Error('No data provided for chart');
  }

  // Create a container div with enhanced styling
  const container = document.createElement('div');
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.backgroundColor = '#ffffff';
  container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  container.style.padding = '8px';
  document.body.appendChild(container);

  // Calculate optimal chart dimensions
  const chartHeight = height - 80; // Reserve space for title and subtitle

  // Calculate Y-axis domain for bars
  const yAxisDomain = calculateYAxisDomain(data, ['value']);

  const chartContent = (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '8px'
    }}>
      {/* Enhanced Header */}
      {(title || subtitle) && (
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '8px',
          borderBottom: '1px solid #f3f4f6',
          paddingBottom: '8px'
        }}>
          {title && (
            <h3 style={{
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#111827',
              margin: '0 0 4px 0',
              lineHeight: '1.2'
            }}>
              {title}
            </h3>
          )}
          {subtitle && (
            <p style={{
              fontSize: '11px',
              color: '#6b7280',
              margin: 0,
              fontWeight: 'normal'
            }}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart 
          data={data} 
          margin={{ top: 10, right: 20, left: 15, bottom: 15 }}
          barCategoryGap="20%"
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#f3f4f6"
            vertical={false}
          />
          <XAxis
            dataKey="time"
            axisLine={false}
            tickLine={false}
            tick={{ 
              fontSize: 10, 
              fill: '#6b7280',
              fontWeight: 500
            }}
            tickFormatter={(value) => formatTimeLabel(value, data)}
            angle={-45}
            textAnchor="end"
            height={50}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 500 }}
            domain={yAxisDomain}
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: '10px', fill: '#6b7280' } } : undefined}
          />
          <Tooltip content={<CustomTooltip unidad={unidad} />} />
          <Bar 
            dataKey="value" 
            fill={color}
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  const root = createRoot(container);
  root.render(chartContent);
  await new Promise(resolve => setTimeout(resolve, 1500));

  try {
    const canvas = await html2canvas(container, {
      width: width,
      height: height,
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      logging: false,
      onclone: (clonedDoc) => {
        const style = clonedDoc.createElement('style');
        style.textContent = `
          * {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
          }
        `;
        clonedDoc.head.appendChild(style);
      }
    });

    return canvas;
  } finally {
    document.body.removeChild(container);
  }
};

export const renderAreaChartToCanvas = async (config: ChartConfig): Promise<HTMLCanvasElement> => {
  const { 
    width, 
    height, 
    data, 
    title, 
    subtitle,
    color = '#2563eb',
    yAxisLabel,
    unidad = ''
  } = config;

  // Validate data
  if (!data || data.length === 0) {
    throw new Error('No data provided for chart');
  }

  // Create a container div with enhanced styling
  const container = document.createElement('div');
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.backgroundColor = '#ffffff';
  container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  container.style.padding = '8px';
  document.body.appendChild(container);

  // Calculate optimal chart dimensions
  const chartHeight = height - 80; // Reserve space for title and subtitle

  // Calculate Y-axis domain for bars
  const yAxisDomain = calculateYAxisDomain(data, ['value']);

  const chartContent = (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '8px'
    }}>
      {/* Enhanced Header */}
      {(title || subtitle) && (
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '8px',
          borderBottom: '1px solid #f3f4f6',
          paddingBottom: '8px'
        }}>
          {title && (
            <h3 style={{
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#111827',
              margin: '0 0 4px 0',
              lineHeight: '1.2'
            }}>
              {title}
            </h3>
          )}
          {subtitle && (
            <p style={{
              fontSize: '11px',
              color: '#6b7280',
              margin: 0,
              fontWeight: 'normal'
            }}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      
      <ResponsiveContainer width="100%" height={chartHeight}>
        <AreaChart 
          data={data} 
          margin={{ top: 10, right: 20, left: 15, bottom: 15 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#f3f4f6"
            vertical={false}
          />
          <XAxis
            dataKey="time"
            axisLine={false}
            tickLine={false}
            tick={{ 
              fontSize: 10, 
              fill: '#6b7280',
              fontWeight: 500
            }}
            tickFormatter={(value) => formatTimeLabel(value, data)}
            angle={-45}
            textAnchor="end"
            height={50}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{
              fontSize: 10,
              fill: '#6b7280',
              fontWeight: 500
            }}
            domain={yAxisDomain}
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: '10px', fill: '#6b7280' } } : undefined}
          />
          <Tooltip content={<CustomTooltip unidad={unidad} />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fill={color}
            fillOpacity={0.3}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  const root = createRoot(container);
  root.render(chartContent);
  await new Promise(resolve => setTimeout(resolve, 1500));

  try {
    const canvas = await html2canvas(container, {
      width: width,
      height: height,
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      logging: false,
      onclone: (clonedDoc) => {
        const style = clonedDoc.createElement('style');
        style.textContent = `
          * {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
          }
        `;
        clonedDoc.head.appendChild(style);
      }
    });

    return canvas;
  } finally {
    document.body.removeChild(container);
  }
};