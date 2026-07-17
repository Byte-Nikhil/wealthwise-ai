import os
import tempfile
import matplotlib
# Set matplotlib backend to Agg to prevent GUI popups
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.models import db_models
from backend.app.services.insight_service import calculate_spending_stats, generate_rule_based_insights, generate_savings_recommendations

def generate_pdf_report(user_id: int, db: Session) -> str:
    """
    Generates a professional financial PDF report for the user.
    - Draws matplotlib plots of category distribution and spending trends.
    - Summarizes financial totals (income, expense, savings).
    - Lists recent anomalies and AI predictions.
    - Returns the absolute file path of the generated PDF.
    """
    # 1. Fetch financial statistics
    stats = calculate_spending_stats(user_id, db)
    user = db.query(db_models.User).filter(db_models.User.id == user_id).first()
    user_name = user.full_name if user and user.full_name else "User"
    
    # 2. Create a temporary file to save the PDF
    temp_dir = tempfile.gettempdir()
    pdf_filename = f"finance_report_{user_id}_{stats['current_month']}.pdf"
    pdf_path = os.path.join(temp_dir, pdf_filename)
    
    # Setup document
    doc = SimpleDocTemplate(pdf_path, pagesize=letter,
                            rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    story = []
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1E3A8A'),  # Deep blue
        spaceAfter=15
    )
    section_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#2563EB'),  # Royal blue
        spaceBefore=12,
        spaceAfter=8
    )
    body_style = ParagraphStyle(
        'ReportBody',
        parent=styles['BodyText'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#374151')  # Dark gray
    )
    bullet_style = ParagraphStyle(
        'ReportBullet',
        parent=styles['Normal'],
        fontSize=9,
        leading=13,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4,
        textColor=colors.HexColor('#374151')
    )
    
    # --- HEADER ---
    story.append(Paragraph("AI-Powered Personal Finance Assistant", title_style))
    story.append(Paragraph(f"<b>Financial Analysis Report:</b> {stats['current_month']}", body_style))
    story.append(Paragraph(f"<b>Prepared For:</b> {user_name} ({user.email if user else ''})", body_style))
    story.append(Paragraph(f"<b>Generated On:</b> {datetime.date.today().strftime('%B %d, %Y')}", body_style))
    story.append(Spacer(1, 15))
    
    # --- FINANCIAL SUMMARY CARD ---
    curr_expenses = stats["current_expenses"]
    curr_income = stats["current_income"]
    net_savings = curr_income - curr_expenses
    
    summary_data = [
        ["Total Income", "Total Expenses", "Net Savings"],
        [f"Rs.{curr_income:,.2f}", f"Rs.{curr_expenses:,.2f}", f"Rs.{net_savings:,.2f}"]
    ]
    
    summary_table = Table(summary_data, colWidths=[170, 170, 170])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#EFF6FF')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1E3A8A')),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('FONTSIZE', (0, 1), (-1, 1), 14),
        ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (2, 1), (2, 1), colors.HexColor('#16A34A') if net_savings >= 0 else colors.HexColor('#DC2626')),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#BFDBFE')),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    
    story.append(Paragraph("Monthly Summary Overview", section_style))
    story.append(summary_table)
    story.append(Spacer(1, 15))
    
    # --- CHART GENERATION (Temporary Files) ---
    temp_chart_paths = []
    
    curr_cat = stats["current_categories"]
    if curr_cat:
        # Generate Category Pie Chart
        plt.figure(figsize=(6, 3))
        labels = list(curr_cat.keys())
        sizes = list(curr_cat.values())
        
        # Color palette matching frontend (blues, grays, greens)
        colors_palette = ['#1E3A8A', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#D1D5DB', '#9CA3AF']
        
        plt.pie(sizes, labels=labels, autopct='%1.1f%%', startangle=140, colors=colors_palette[:len(labels)],
                textprops={'fontsize': 8})
        plt.title("Expense Distribution by Category", fontsize=10, fontweight='bold', color='#1E3A8A')
        plt.tight_layout()
        
        pie_path = os.path.join(temp_dir, f"chart_pie_{user_id}.png")
        plt.savefig(pie_path, dpi=150)
        plt.close()
        temp_chart_paths.append(pie_path)
    
    # Generate Trend Chart (Expenses vs Income last few months)
    historical_tx = db.query(
        func.strftime("%Y-%m", db_models.Transaction.date).label("month"),
        db_models.Transaction.type.label("type"),
        func.sum(db_models.Transaction.amount).label("total")
    ).filter(
        db_models.Transaction.user_id == user_id
    ).group_by("month", "type").all()
    
    trend_data = {}
    for h in historical_tx:
        if h.month not in trend_data:
            trend_data[h.month] = {"income": 0.0, "expense": 0.0}
        trend_data[h.month][h.type] = float(h.total)
        
    if trend_data:
        sorted_months = sorted(trend_data.keys())
        incomes = [trend_data[m]["income"] for m in sorted_months]
        expenses = [trend_data[m]["expense"] for m in sorted_months]
        
        plt.figure(figsize=(6, 3))
        x = np.arange(len(sorted_months))
        width = 0.35
        
        plt.bar(x - width/2, incomes, width, label='Income', color='#16A34A')
        plt.bar(x + width/2, expenses, width, label='Expense', color='#2563EB')
        
        plt.xlabel('Month', fontsize=8)
        plt.ylabel('Amount (Rs.)', fontsize=8)
        plt.title('Monthly Income vs Expense Trend', fontsize=10, fontweight='bold', color='#1E3A8A')
        plt.xticks(x, sorted_months, fontsize=7)
        plt.legend(fontsize=8)
        plt.grid(True, linestyle='--', alpha=0.5)
        plt.tight_layout()
        
        bar_path = os.path.join(temp_dir, f"chart_bar_{user_id}.png")
        plt.savefig(bar_path, dpi=150)
        plt.close()
        temp_chart_paths.append(bar_path)
        
    # --- CATEGORY ANALYSIS TABLE ---
    cat_rows = [["Expense Category", "Spent Amount", "Budget Limit", "Status"]]
    for cat in CATEGORIES:
        amt = curr_cat.get(cat, 0.0)
        budget_limit = stats["budgets"].get(cat, 0.0)
        
        if budget_limit > 0:
            budget_str = f"Rs.{budget_limit:,.2f}"
            status = "Over Budget" if amt > budget_limit else "Under Budget"
        else:
            budget_str = "No Budget Set"
            status = "-"
            
        cat_rows.append([cat, f"Rs.{amt:,.2f}", budget_str, status])
        
    cat_table = Table(cat_rows, colWidths=[150, 120, 120, 120])
    cat_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E3A8A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 5),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F9FAFB')]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    
    story.append(Paragraph("Category Spending Details", section_style))
    story.append(cat_table)
    story.append(Spacer(1, 10))
    
    # Embed Charts Side-by-Side or vertically (we'll do vertically for page break safety)
    chart_flowables = []
    for chart_path in temp_chart_paths:
        if os.path.exists(chart_path):
            chart_flowables.append(Image(chart_path, width=360, height=180))
            chart_flowables.append(Spacer(1, 10))
            
    if chart_flowables:
        story.append(Paragraph("Visual Spending Charts", section_style))
        story.extend(chart_flowables)
        
    # --- AI INSIGHTS & RECOMMENDATIONS ---
    story.append(Paragraph("AI Spending Observations", section_style))
    insights = generate_rule_based_insights(stats)
    for ins in insights[:5]: # Top 5 insights
        story.append(Paragraph(f"&bull; {ins}", bullet_style))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph("Saving Recommendations", section_style))
    recs = generate_savings_recommendations(stats)
    for rec in recs[:4]: # Top 4 recommendations
        story.append(Paragraph(f"&bull; {rec}", bullet_style))
    story.append(Spacer(1, 10))
    
    # --- ML PREDICTIONS SECTION ---
    # Fetch latest prediction from DB
    latest_pred = db.query(db_models.Prediction).filter(
        db_models.Prediction.user_id == user_id
    ).order_matches = db.query(db_models.Prediction).filter(
        db_models.Prediction.user_id == user_id
    ).order_by(db_models.Prediction.created_at.desc()).first()
    
    if latest_pred:
        story.append(Paragraph("Machine Learning Spending Forecast", section_style))
        pred_text = f"Based on your historical spending, the <b>{latest_pred.model_used}</b> model predicts " \
                    f"your expenses for next month will be <b>Rs.{latest_pred.predicted_amount:,.2f}</b>."
        story.append(Paragraph(pred_text, body_style))
        
        metrics_text = f"Model Evaluation Metrics: MAE = Rs.{latest_pred.mae:.2f} | " \
                       f"RMSE = Rs.{latest_pred.rmse:.2f} | R&sup2; Score = {latest_pred.r2_score:.4f}"
        story.append(Paragraph(metrics_text, ParagraphStyle('Metrics', parent=body_style, fontName='Helvetica-Oblique', textColor=colors.HexColor('#4B5563'))))
        story.append(Spacer(1, 10))
        
    # --- SUSPICIOUS ANOMALIES ---
    anomalies = db.query(db_models.Transaction).filter(
        db_models.Transaction.user_id == user_id,
        db_models.Transaction.type == "expense",
        db_models.Transaction.is_anomaly == True
    ).order_by(db_models.Transaction.date.desc()).limit(5).all()
    
    if anomalies:
        story.append(Paragraph("Suspected Unusual Transactions (Anomaly Detection)", section_style))
        anomaly_rows = [["Date", "Description", "Amount", "Category"]]
        for a in anomalies:
            anomaly_rows.append([a.date.strftime("%Y-%m-%d"), a.description, f"Rs.{a.amount:,.2f}", a.category])
            
        anomaly_table = Table(anomaly_rows, colWidths=[90, 200, 100, 120])
        anomaly_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#FEE2E2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#991B1B')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#FCA5A5')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#FFF5F5')]),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(anomaly_table)
        
    # Build Document
    doc.build(story)
    
    # Delete temporary chart image files after compiling PDF
    for path in temp_chart_paths:
        try:
            if os.path.exists(path):
                os.remove(path)
        except Exception as e:
            print(f"Error removing temporary chart image: {e}")
            
    return pdf_path
import datetime
