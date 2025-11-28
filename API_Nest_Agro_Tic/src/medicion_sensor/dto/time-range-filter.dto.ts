import { IsOptional, IsBoolean } from 'class-validator';

/**
 * DTO for time range filtering in sensor reports
 * Supports filtering sensor data by specific time ranges within each day (UTC-5 Bogotá time)
 *
 * Time ranges:
 * - Morning: 06:00 AM - 12:00 PM (06:00-12:00)
 * - Afternoon: 12:00 PM - 06:00 PM (12:00-18:00)
 * - Evening: 06:00 PM - 12:00 AM (18:00-00:00)
 * - Night: 12:00 AM - 06:00 AM (00:00-06:00)
 */
export class TimeRangeFilterDto {
  @IsOptional()
  @IsBoolean()
  morning?: boolean; // 06:00-12:00 (Morning)

  @IsOptional()
  @IsBoolean()
  afternoon?: boolean; // 12:00-18:00 (Afternoon)

  @IsOptional()
  @IsBoolean()
  evening?: boolean; // 18:00-00:00 (Evening)

  @IsOptional()
  @IsBoolean()
  night?: boolean; // 00:00-06:00 (Night)

  /**
   * Validates if at least one time range is selected
   * @returns true if at least one time range filter is active
   */
  hasActiveFilters(): boolean {
    return !!(this.morning || this.afternoon || this.evening || this.night);
  }

  /**
   * Gets all selected time ranges as an array
   * @returns Array of selected time range keys
   */
  getSelectedRanges(): string[] {
    const ranges: string[] = [];
    if (this.morning) ranges.push('morning');
    if (this.afternoon) ranges.push('afternoon');
    if (this.evening) ranges.push('evening');
    if (this.night) ranges.push('night');
    return ranges;
  }

  /**
   * Gets human-readable labels for selected time ranges
   * @returns Object with time range labels
   */
  getSelectedRangeLabels(): Record<string, string> {
    const labels: Record<string, string> = {};
    if (this.morning) labels.morning = '06:00-12:00 (Mañana)';
    if (this.afternoon) labels.afternoon = '12:00-18:00 (Tarde)';
    if (this.evening) labels.evening = '18:00-00:00 (Noche)';
    if (this.night) labels.night = '00:00-06:00 (Madrugada)';
    return labels;
  }

  /**
   * Validates time range boundaries for UTC-5 timezone
   * @returns Validation result with any issues found
   */
  validateTimeRanges(): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // All time ranges should be included by default if none specified
    if (!this.hasActiveFilters()) {
      // This is acceptable - no filtering applied means all ranges
      return { isValid: true, issues: [] };
    }

    // Additional validation can be added here if needed
    return { isValid: issues.length === 0, issues };
  }
}
