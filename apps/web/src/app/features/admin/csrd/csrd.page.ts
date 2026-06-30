import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import {
  AuditorGrant,
  CreatedAuditorGrant,
  CsrdReportSummary,
  CsrdReportView,
  DataQualityReport,
  ReportStandard,
  TrendReport,
} from '../../../core/models';
import { AuditorAccessPanelComponent } from '../../corporate/auditor-access-panel.component';
import { DataQualityPanelComponent } from '../../corporate/data-quality-panel.component';
import { ReportBuilderComponent } from '../../corporate/report-builder.component';
import { TrendChartComponent } from '../../corporate/trend-chart.component';

/**
 * Admin CSRD/ESG reporting page. Read-only over the E12 ledger: build a
 * standards-mapped report, export it, inspect diversity data quality and the
 * year-over-year trend, and manage time-limited auditor access grants.
 */
@Component({
  selector: 'app-csrd-page',
  standalone: true,
  imports: [
    RouterLink,
    ReportBuilderComponent,
    DataQualityPanelComponent,
    TrendChartComponent,
    AuditorAccessPanelComponent,
  ],
  template: `
    <section class="mx-auto max-w-6xl px-4 py-10">
      <header class="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="font-display text-3xl font-semibold text-ink">ESG / CSRD reporting</h1>
          <p class="mt-1 text-sm text-slate2">
            Audit-trail and CSRD-aligned reporting on the immutable ledger.
          </p>
        </div>
        <a
          routerLink="/admin"
          class="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-mist"
        >
          Back to admin
        </a>
      </header>

      @if (error()) {
        <p
          class="mb-6 rounded-lg bg-brand-orange/10 px-4 py-3 text-sm text-brand-orange"
          role="alert"
        >
          {{ error() }}
        </p>
      }

      <div class="space-y-6">
        <app-report-builder
          [report]="report()"
          (generate)="generateReport($event)"
          (exportCsv)="exportReport($event, 'csv')"
          (exportPdf)="exportReport($event, 'pdf')"
        />

        <div class="grid gap-6 lg:grid-cols-2">
          @if (dataQuality(); as dq) {
            <app-data-quality-panel [report]="dq" />
          }
          @if (trend(); as t) {
            <app-trend-chart [report]="t" />
          }
        </div>

        <app-auditor-access-panel
          [grants]="grants()"
          [created]="createdGrant()"
          (create)="createGrant($event)"
          (revoke)="revokeGrant($event)"
        />
      </div>
    </section>
  `,
})
export class CsrdPage implements OnInit {
  private readonly api = inject(ApiService);

  readonly report = signal<CsrdReportView | null>(null);
  readonly dataQuality = signal<DataQualityReport | null>(null);
  readonly trend = signal<TrendReport | null>(null);
  readonly grants = signal<AuditorGrant[]>([]);
  readonly createdGrant = signal<CreatedAuditorGrant | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.generateReport('GRI_2024');
    this.loadDataQuality();
    this.loadTrend();
    this.loadGrants();
  }

  generateReport(standard: ReportStandard): void {
    this.api.csrdReport(standard).subscribe({
      next: (r) => this.report.set(r),
      error: () => this.error.set('Failed to build the report.'),
    });
  }

  exportReport(standard: ReportStandard, format: 'csv' | 'pdf'): void {
    // Persist a snapshot first, then download it (export is by report id).
    this.api.csrdCreateReport(standard).subscribe({
      next: (summary: CsrdReportSummary) => {
        this.api.csrdReportExport(summary.id, format).subscribe({
          next: (blob) => this.downloadBlob(blob, `bursa-csrd-report-${summary.id}.${format}`),
          error: () => this.error.set('Failed to export the report.'),
        });
      },
      error: () => this.error.set('Failed to generate the report.'),
    });
  }

  loadDataQuality(): void {
    this.api.csrdDataQuality().subscribe({
      next: (dq) => this.dataQuality.set(dq),
      error: () => this.error.set('Failed to load data quality.'),
    });
  }

  loadTrend(): void {
    this.api.csrdTrend().subscribe({
      next: (t) => this.trend.set(t),
      error: () => this.error.set('Failed to load the trend.'),
    });
  }

  loadGrants(): void {
    this.api.csrdListGrants().subscribe({
      next: (g) => this.grants.set(g),
      error: () => this.error.set('Failed to load auditor grants.'),
    });
  }

  createGrant(body: { label: string; ttlHours: number }): void {
    this.api.csrdCreateGrant(body).subscribe({
      next: (created) => {
        this.createdGrant.set(created);
        this.loadGrants();
      },
      error: () => this.error.set('Failed to create the grant.'),
    });
  }

  revokeGrant(id: string): void {
    this.api.csrdRevokeGrant(id).subscribe({
      next: () => this.loadGrants(),
      error: () => this.error.set('Failed to revoke the grant.'),
    });
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
