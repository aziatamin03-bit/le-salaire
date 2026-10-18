// OBAYOLI HR & Payroll System Main Engine
(function() {
	if (window.lucide) lucide.createIcons();
	const saveHistoryKey = 'obayoli-save-history';
	let saveHistory = [];
	let legacyHRData = null;
	let currentUser = null;
	let remoteRevision = 0;
	let cloudReady = false;
	let pendingCloudSave = false;
	let cloudSaveTimer = null;
	let cloudSavePromise = Promise.resolve(true);
	let hasUnsavedChanges = false;
	let lastSaveTime = new Date();
	const currencyLabel = 'د.م.';
	document.querySelectorAll('.currency').forEach(element => { element.textContent = currencyLabel; });
	const searchInput = document.getElementById('searchInput');
	const employeeRows = document.getElementById('employeeRows');
	const emptyState = document.getElementById('emptyState');
	const dialog = document.getElementById('employeeDialog');
	const toast = document.getElementById('toast');
	const sectionView = document.getElementById('sectionView');
	const navItems = [...document.querySelectorAll('.nav-item[data-view]')];
	const payrollSections = [document.querySelector('.page-heading'), document.querySelector('.payroll-panel')];
	const pageTitles = { home: 'الرئيسية', employees: 'الموظفون', planning: 'التخطيط الأسبوعي', payroll: 'إدارة الرواتب', attendance: 'الغيابات', 'attendance-records': 'سجل الحضور', leaves: 'الإجازات', holidays: 'العطل الرسمية', reports: 'التقارير', monthly: 'التقرير الشهري' };
	const localDatabaseKey = 'obayoli-hr-local-v2';
	const languageStorageKey = 'obayoli-hr-language';
	const legacyExportButton = document.getElementById('exportLegacyData');
	try {
		legacyExportButton.hidden = location.protocol !== 'file:' || !(
			localStorage.getItem(localDatabaseKey) || localStorage.getItem('obayoli-hr-local-v1')
		);
	} catch (error) {
		console.error('تعذر التحقق من البيانات المحلية القديمة:', error);
	}

	const translationRows = [
		['رقم البطاقة الوطنية', 'National ID number', 'Numéro de carte nationale'], ['البريد الإلكتروني', 'Email', 'E-mail'],
		['إدارة الموارد البشرية', 'HR Management', 'Gestion des ressources humaines'],
		['القائمة الرئيسية', 'Main menu', 'Menu principal'], ['الرئيسية', 'Home', 'Accueil'], ['الموظفون', 'Employees', 'Employés'], ['التخطيط الأسبوعي', 'Weekly planning', 'Planning hebdomadaire'], ['الرواتب', 'Payroll', 'Paie'], ['الغيابات', 'Attendance', 'Présences'], ['الإجازات', 'Leave', 'Congés'], ['العطل الرسمية', 'Public holidays', 'Jours fériés'], ['التقارير', 'Reports', 'Rapports'], ['التقرير الشهري', 'Monthly report', 'Rapport mensuel'], ['إدارة الرواتب', 'Payroll management', 'Gestion de la paie'], ['الإعدادات', 'Settings', 'Paramètres'], ['الإشعارات', 'Notifications', 'Notifications'], ['اختر الشهر', 'Choose month', 'Choisir le mois'], ['تصدير PDF', 'Export PDF', 'Exporter en PDF'], ['إضافة موظف', 'Add employee', 'Ajouter un employé'],
		['جدول الرواتب', 'Payroll table', 'Tableau de paie'], ['ابحث عن موظف...', 'Search employees...', 'Rechercher un employé...'], ['اليومي = الراتب الشهري ÷ 26، والساعة = اليومي ÷ 8. يُخصم الغياب والمرض وmis a pied بحسب الراتب اليومي، ويُضاف اليوم الإضافي ويوم الراحة بسعر اليوم.', 'Daily pay = monthly salary ÷ 26; hourly pay = daily pay ÷ 8. Absence, sick leave and suspension are deducted at the daily rate; extra days and rest days are added at the daily rate.', 'Le salaire journalier = salaire mensuel ÷ 26 ; le salaire horaire = salaire journalier ÷ 8. Les absences, maladies et mises à pied sont déduites au tarif journalier ; les jours supplémentaires et de repos sont ajoutés au même tarif.'],
		['اسم الموظف', 'Employee name', 'Nom de l’employé'], ['الراتب الشهري', 'Monthly salary', 'Salaire mensuel'], ['التسبيق', 'Advance', 'Avance'], ['الراتب اليومي', 'Daily pay', 'Salaire journalier'], ['الراتب للساعة', 'Hourly pay', 'Salaire horaire'], ['الغياب (أيام)', 'Absence (days)', 'Absence (jours)'], ['mis a pied (أيام)', 'Suspension (days)', 'Mise à pied (jours)'], ['يوم إضافي', 'Extra days', 'Jours supplémentaires'], ['يوم راحة', 'Rest days', 'Jours de repos'], ['المرض (أيام)', 'Sick leave (days)', 'Maladie (jours)'], ['أيام العمل', 'Working days', 'Jours travaillés'], ['الراتب الصافي', 'Net salary', 'Salaire net'], ['لا توجد نتائج مطابقة لبحثك.', 'No matching results.', 'Aucun résultat correspondant.'], ['موظف', 'employees', 'employés'],
		['إضافة موظف جديد', 'Add new employee', 'Ajouter un nouvel employé'], ['رقم الهاتف', 'Phone number', 'Téléphone'], ['تاريخ دخول الموظف', 'Hire date', 'Date d’embauche'], ['اكتب المنصب أو القسم', 'Enter the job title or department', 'Saisissez le poste ou le service'], ['الراتب اليومي', 'Daily pay', 'Salaire journalier'], ['الراتب الصافي', 'Net salary', 'Salaire net'], ['إلغاء', 'Cancel', 'Annuler'], ['حفظ الموظف', 'Save employee', 'Enregistrer l’employé'], ['تعديل بيانات الموظف', 'Edit employee', 'Modifier l’employé'], ['حفظ التعديلات', 'Save changes', 'Enregistrer les modifications'],
		['الشركة', 'Company', 'Entreprise'], ['العملة', 'Currency', 'Devise'], ['الدرهم المغربي (د.م.)', 'Moroccan dirham (MAD)', 'Dirham marocain (MAD)'], ['لغة النظام', 'System language', 'Langue du système'], ['عرض مضغوط للجدول', 'Compact table view', 'Affichage compact du tableau'], ['تم', 'Done', 'Terminé'], ['إغلاق', 'Close', 'Fermer'],
		['نظرة شاملة على رواتب الموظفين ومستحقاتهم الشهرية.', 'An overview of employee salaries and monthly entitlements.', 'Vue d’ensemble des salaires et des droits mensuels des employés.'], ['الرئيسية', 'Home', 'Accueil'], ['ملخص سريع لحركة الموارد البشرية اليوم.', 'A quick overview of today’s HR activity.', 'Aperçu rapide de l’activité RH du jour.'], ['إجمالي الموظفين', 'Total employees', 'Nombre total d’employés'], ['ضمن سجل الموارد البشرية', 'In the HR register', 'Dans le registre RH'], ['إجمالي رواتب الموظفين', 'Total employee salaries', 'Total des salaires'], ['مجموع الرواتب الشهرية المسجلة', 'Total recorded monthly salaries', 'Total des salaires mensuels enregistrés'], ['إجمالي التسبيق', 'Total advances', 'Total des avances'], ['مجموع التسبيقات المسجلة للموظفين', 'Total employee advances recorded', 'Total des avances enregistrées'], ['طلبات إجازة معلّقة', 'Pending leave requests', 'Demandes de congé en attente'], ['بانتظار مراجعة المدير', 'Awaiting manager review', 'En attente de validation'], ['الوصول السريع', 'Quick access', 'Accès rapide'], ['عرض الموظفين', 'View employees', 'Voir les employés'], ['متابعة الحضور', 'Track attendance', 'Suivi des présences'], ['مراجعة الإجازات', 'Review leave requests', 'Examiner les demandes de congé'],
		['قائمة الموظفين المسجلين وبياناتهم الأساسية.', 'Registered employees and their basic information.', 'Employés enregistrés et leurs informations principales.'], ['دليل الموظفين', 'Employee directory', 'Annuaire des employés'], ['ابحث بالاسم أو POSTE...', 'Search by name or job title...', 'Rechercher par nom ou poste...'], ['POSTE', 'Job title', 'Poste'], ['SALAIRE', 'Salary', 'Salaire'], ['إجراءات', 'Actions', 'Actions'], ['موظفاً', 'employees', 'employés'],
		['جدول أسبوعي لتوزيع المهام أو الورديات على الموظفين.', 'A weekly table for assigning tasks or shifts to employees.', 'Un tableau hebdomadaire pour répartir les tâches ou les équipes.'], ['اختر أي تاريخ لعرض الأسبوع الذي يقع فيه.', 'Choose any date to display its week.', 'Choisissez une date pour afficher sa semaine.'], ['الأسبوع (من الاثنين إلى الأحد)', 'Week (Monday to Sunday)', 'Semaine (du lundi au dimanche)'], ['أسبوع سابق', 'Previous week', 'Semaine précédente'], ['أسبوع تالٍ', 'Next week', 'Semaine suivante'], ['التاريخ', 'Date', 'Date'], ['الساعة', 'Hour', 'Heure'], ['تنزيل التخطيط الأسبوعي PDF', 'Download weekly plan PDF', 'Télécharger le planning hebdomadaire en PDF'],
		['سجل متابعة حالات الموظفين لليوم.', 'Daily employee attendance and status register.', 'Registre quotidien des présences et statuts des employés.'], ['تنزيل سجل اليوم PDF', 'Download today’s register PDF', 'Télécharger le registre du jour en PDF'], ['حفظ سجل اليوم', 'Save today’s register', 'Enregistrer le registre du jour'], ['مريض', 'Sick', 'Malade'], ['متأخر', 'Late', 'En retard'], ['غائب', 'Absent', 'Absent'], ['إجمالي الموظفين', 'Total employees', 'Nombre total d’employés'], ['سجل اليوم', 'Today’s register', 'Registre du jour'], ['تاريخ الحضور', 'Attendance date', 'Date de présence'], ['وقت الدخول', 'Time in', 'Heure d’arrivée'], ['وقت الخروج', 'Time out', 'Heure de départ'], ['حالة', 'Status', 'Statut'], ['ساعات العمل', 'Working hours', 'Heures travaillées'],
		['مراجعة طلبات الإجازة واتخاذ الإجراء المناسب.', 'Review leave requests and take appropriate action.', 'Examinez les demandes de congé et prenez les mesures nécessaires.'], ['إضافة طلب إجازة', 'Add leave request', 'Ajouter une demande de congé'], ['الموظف', 'Employee', 'Employé'], ['نوع الإجازة', 'Leave type', 'Type de congé'], ['سنوية', 'Annual', 'Annuel'], ['استثنائية', 'Exceptional', 'Exceptionnel'], ['مرضية', 'Sick leave', 'Maladie'], ['أخرى', 'Other', 'Autre'], ['من', 'From', 'Du'], ['إلى', 'To', 'Au'], ['إضافة الطلب', 'Add request', 'Ajouter la demande'], ['طلبات الإجازة', 'Leave requests', 'Demandes de congé'], ['المدة', 'Duration', 'Durée'], ['الحالة والإجراء', 'Status and action', 'Statut et action'],
		['العطل الوطنية والدينية الرسمية في المغرب المطبقة على الموظفين.', 'Official national and religious holidays in Morocco applied to employees.', 'Jours fériés nationaux et religieux officiels au Maroc appliqués aux employés.'], ['سنة العطل', 'Holiday year', 'Année des congés'], ['السنة', 'Year', 'Année'], ['عطلة وطنية', 'National holiday', 'Jour férié national'], ['عطلة دينية', 'Religious holiday', 'Jour férié religieux'], ['إجمالي العطل', 'Total holidays', 'Total des jours fériés'], ['تواريخ ثابتة كل سنة', 'Fixed dates every year', 'Dates fixes chaque année'], ['حسب الإعلان الرسمي', 'Per official announcement', 'Selon l’annonce officielle'], ['الموظفون المستفيدون', 'Benefiting employees', 'Employés concernés'], ['يشمل جميع الموظفين', 'All employees included', 'Tous les employés inclus'], ['التقويم الشهري للعطل', 'Monthly holiday calendar', 'Calendrier mensuel des jours fériés'], ['العطل الوطنية', 'National holidays', 'Jours fériés nationaux'], ['أقرب عطلة وطنية', 'Next national holiday', 'Prochain jour férié national'], ['ملخص', 'Summary', 'Résumé'],
		['ملخصات قابلة للتصدير من بيانات الرواتب المسجلة.', 'Exportable summaries from recorded payroll data.', 'Synthèses exportables des données de paie enregistrées.'], ['إجمالي الرواتب', 'Total salaries', 'Total des salaires'], ['صافي المستحقات', 'Net entitlements', 'Net à payer'], ['فترة التقرير', 'Report period', 'Période du rapport'], ['تفاصيل رواتب الموظفين', 'Employee payroll details', 'Détails de paie des employés'], ['تصدير CSV', 'Export CSV', 'Exporter en CSV'], ['لا توجد بيانات موظفين لعرضها في التقرير.', 'No employee data to display.', 'Aucune donnée employé à afficher.'],
		['تم الصرف', 'Paid', 'Payé'], ['قيد الانتظار', 'Pending', 'En attente'], ['مراجعة', 'Under review', 'À vérifier'], ['تم بنجاح', 'Completed successfully', 'Terminé avec succès']
	];

	const translations = Object.fromEntries(translationRows.map(([arabic, english, french]) => [arabic, { en: english, fr: french }]));
	let currentLanguage = 'ar';
	try {
		const savedLanguage = localStorage.getItem(languageStorageKey);
		if (['ar', 'fr', 'en'].includes(savedLanguage)) currentLanguage = savedLanguage;
	} catch (error) {}
	const translatedTextNodes = new WeakMap();
	const translatedAttributes = new WeakMap();
	const leaveRequestStatuses = [];
	const pageSize = 4;
	let currentPage = 1;
	let selectedMonth = getCurrentMonthKey();
	let selectedReportMonths = [selectedMonth];
	let reportMonth = '';
	let monthlyArchives = [];
	let selectedAttendanceDate = getLocalDateValue();
	let selectedScheduleWeek = getWeekStartDate(getLocalDateValue());
	let weeklySchedule = {};
	let activeEmployeeRow = null;
	let attendanceMarkedForAll = false;
	let attendanceStatusOverrides = [];
	let attendanceDetailsOverrides = [];
	let lastAttendanceRegistration = null;
	let attendanceHistory = {};
	let leaveRequests = [];
	let deletedEmployees = [];
	let religiousHolidayDatesByYear = {
		"2026": {
			"فاتح محرم (رأس السنة الهجرية)": ["2026-06-17"],
			"عيد المولد النبوي الشريف": ["2026-08-26", "2026-08-27"],
			"عيد الفطر": ["2026-03-21", "2026-03-22"],
			"عيد الأضحى": ["2026-05-28", "2026-05-29"]
		},
		"2025": {
			"فاتح محرم (رأس السنة الهجرية)": ["2025-06-27"],
			"عيد المولد النبوي الشريف": ["2025-09-05", "2025-09-06"],
			"عيد الفطر": ["2025-03-31", "2025-04-01"],
			"عيد الأضحى": ["2025-06-07", "2025-06-08"]
		}
	};
	let holidayGridAssignments = {};
	let holidayGridAnnualValues = {};
	const religiousHolidayLoads = new Map();
	let toastTimer;

	function translateValue(value) {
		if (currentLanguage === 'ar') return value;
		const trimmed = value.trim();
		const direct = translations[trimmed]?.[currentLanguage];
		if (direct) return value.replace(trimmed, direct);
		return value;
	}

	function translateNode(node) {
		const previous = translatedTextNodes.get(node);
		const source = previous && node.nodeValue === previous.translated ? previous.source : node.nodeValue;
		const translated = translateValue(source);
		translatedTextNodes.set(node, { source, translated });
		if (node.nodeValue !== translated) node.nodeValue = translated;
	}

	function translateElementAttributes(element) {
		const attributes = ['aria-label', 'title', 'placeholder'];
		if (element.matches('#settingsDialog input[readonly]')) attributes.push('value');
		attributes.forEach(attribute => {
			if (!element.hasAttribute(attribute)) return;
			let values = translatedAttributes.get(element);
			if (!values) { values = {}; translatedAttributes.set(element, values); }
			const current = element.getAttribute(attribute);
			const previous = values[attribute];
			const source = previous && current === previous.translated ? previous.source : current;
			const translated = translateValue(source);
			values[attribute] = { source, translated };
			if (current !== translated) {
				element.setAttribute(attribute, translated);
				if (attribute === 'value') element.value = translated;
			}
		});
	}

	function translateSubtree(root) {
		translateElementAttributes(root);
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
		while (walker.nextNode()) translateNode(walker.currentNode);
		root.querySelectorAll?.('*').forEach(translateElementAttributes);
	}

	function applyLanguage(language) {
		currentLanguage = ['ar', 'fr', 'en'].includes(language) ? language : 'ar';
		document.documentElement.lang = currentLanguage;
		document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
		translateSubtree(document.body);
	}

	function showToast(message, securityAlert = false) {
		document.getElementById('toastMessage').textContent = translateValue(message);
		toast.classList.toggle('security-alert', securityAlert);
		toast.classList.add('show');
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
	}

	function containsSuspiciousMarkup(value) {
		return /<[^>]*>|javascript\s*:|data\s*:\s*text\/html|\bon[a-z]+\s*=|[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/i.test(value);
	}

	function getPaidEmployeeCount() {
		return [...employeeRows.rows].filter(row => row.dataset.status === 'paid').length;
	}

	function getTotalMonthlySalary() {
		return [...employeeRows.rows].reduce((total, row) => total + (Number(row.dataset.salary) || 0), 0);
	}

	function getTotalAdvances() {
		return [...employeeRows.rows].reduce((total, row) => total + (Number(row.dataset.advance) || 0), 0);
	}

	function getTotalNetSalary() {
		return [...employeeRows.rows].reduce((total, row) => total + (Number(row.dataset.netSalary) || 0), 0);
	}

	function renderReportCharts() {
		const ctx1 = document.getElementById('salaryChart');
		const ctx2 = document.getElementById('attendanceChart');
		if (!ctx1 || !ctx2 || !window.Chart) return;
		const employees = [...employeeRows.rows].map(r => r.querySelector('.employee-name').textContent);
		const salaries = [...employeeRows.rows].map(r => Number(r.dataset.salary) || 0);
		const absences = [...employeeRows.rows].map(r => Number(r.dataset.absenceDays) || 0);
		const lates = [...employeeRows.rows].map(r => Number(r.dataset.misAPiedDays) || 0);
		const sickDays = [...employeeRows.rows].map(r => Number(r.dataset.sickDays) || 0);
		new Chart(ctx1, {
			type: 'bar',
			data: { labels: employees, datasets: [{ label: `الراتب (${currencyLabel})`, data: salaries, backgroundColor: '#28688e', borderRadius: 4 }] },
			options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
		});
		new Chart(ctx2, {
			type: 'doughnut',
			data: {
				labels: ['غياب', 'تأخير', 'مرض'],
				datasets: [{ data: [absences.reduce((a,b)=>a+b,0), lates.reduce((a,b)=>a+b,0), sickDays.reduce((a,b)=>a+b,0)], backgroundColor: ['#b44c43', '#a66418', '#28688e'] }]
			},
			options: { responsive: true, maintainAspectRatio: false }
		});
	}

	function employeeRowsToReport(rows) {
		return [...rows.rows].map(row => [
			row.querySelector('.employee-name').textContent,
			`${formatPayrollAmount(row.dataset.salary)} ${currencyLabel}`,
			`${formatPayrollAmount(row.dataset.advance)} ${currencyLabel}`,
			`${row.querySelector('[data-result="daily"]').textContent} ${currencyLabel}`,
			`${row.querySelector('[data-result="hourly"]').textContent} ${currencyLabel}`,
			row.dataset.absenceDays,
			row.dataset.misAPiedDays || 0,
			row.dataset.extraDays,
			row.dataset.restDays,
			row.dataset.sickDays,
			row.dataset.workDays,
			`${row.querySelector('[data-result="net"]').textContent} ${currencyLabel}`
		]);
	}

	function formatPayrollAmount(amount) {
		return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0);
	}

	function getWorkedHours(timeIn, timeOut) {
		if (!/^\d{2}:\d{2}$/.test(timeIn || '') || !/^\d{2}:\d{2}$/.test(timeOut || '')) return null;
		const [startHour, startMinute] = timeIn.split(':').map(Number);
		const [endHour, endMinute] = timeOut.split(':').map(Number);
		let duration = endHour * 60 + endMinute - (startHour * 60 + startMinute);
		if (duration < 0) duration += 24 * 60;
		return Math.round(duration / 60 * 100) / 100;
	}

	function formatWorkedHours(timeIn, timeOut) {
		const hours = getWorkedHours(timeIn, timeOut);
		return hours === null ? '—' : `${new Intl.NumberFormat('ar-MA', { maximumFractionDigits: 2 }).format(hours)} ساعة`;
	}

	function getAttendanceStatuses() {
		return [...employeeRows.rows].map((row, index) => attendanceStatusOverrides[index] || (attendanceMarkedForAll ? 'paid' : 'none'));
	}

	function updateAttendanceCounts() {
		if (!sectionView) return;
		const statuses = [...sectionView.querySelectorAll('.attendance-select')].map(select => select?.value || '');
		const sickCount = sectionView.querySelector('#attendanceSick');
		const lateCount = sectionView.querySelector('#attendanceLate');
		const absentCount = sectionView.querySelector('#attendanceAbsent');
		if (sickCount) sickCount.textContent = statuses.filter(status => status === 'paid').length;
		if (lateCount) lateCount.textContent = statuses.filter(status => status === 'pending').length;
		if (absentCount) absentCount.textContent = statuses.filter(status => status === 'review').length;
	}

	function getAttendanceDetails(row, index) {
		return attendanceDetailsOverrides[index] || {
			position: row.dataset.department || '',
			timeIn: '',
			timeOut: ''
		};
	}

	function getAttendanceRecord(date, statuses = getAttendanceStatuses()) {
		return {
			date,
			employees: [...employeeRows.rows].map((row, index) => {
				const details = getAttendanceDetails(row, index);
				return {
					name: row.querySelector('.employee-name').textContent,
					position: details.position || row.dataset.department || '',
					timeIn: details.timeIn || '',
					timeOut: details.timeOut || '',
					workHours: getWorkedHours(details.timeIn, details.timeOut),
					status: statuses[index] || 'none'
				};
			})
		};
	}

	function downloadPdfReport(title, reportLines, filename, options = {}) {
		try {
			const canvas = document.createElement('canvas');
			canvas.width = 1684;
			canvas.height = 1190;
			const context = canvas.getContext('2d');
			if (!context) throw new Error('Canvas is unavailable');
			const encoder = new TextEncoder();
			const pageImages = [];
			const margin = 64;
			const primaryColor = options.primaryColor || '#d85b91';
			const accentColor = options.accentColor || '#168bda';
			const alternateRowColor = options.alternateRowColor || '#eaf2ee';
			let pageIndex = 0;
			let y = 100;
			let repeatedHeader = null;

			const startPage = () => {
				context.fillStyle = '#ffffff';
				context.fillRect(0, 0, canvas.width, canvas.height);
				context.direction = 'rtl';
				context.textAlign = 'right';
				context.fillStyle = accentColor;
				context.fillRect(0, 0, canvas.width, 12);
				context.fillStyle = '#173d36';
				context.font = 'bold 17px Arial, sans-serif';
				context.fillText('OBAYOLI  |  إدارة الموارد البشرية والرواتب', canvas.width - margin, 39);
				context.font = 'bold 34px Arial, sans-serif';
				context.fillText(title, canvas.width - margin, 77);
				context.font = '16px Arial, sans-serif';
				context.fillStyle = '#66736c';
				context.fillText(`تاريخ التقرير: ${getLocalDateValue()}  |  صفحة ${pageIndex + 1}`, canvas.width - margin, 108);
				if (options.subtitle) {
					context.font = 'bold 17px Arial, sans-serif';
					context.fillStyle = primaryColor;
					context.fillText(options.subtitle, canvas.width - margin, 137);
					y = 174;
				} else y = 154;
				context.strokeStyle = '#e6eaf0';
				context.beginPath();
				context.moveTo(margin, 122);
				context.lineTo(canvas.width - margin, 122);
				context.stroke();
			};

			const savePage = () => {
				const encodedImage = canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
				const binaryImage = atob(encodedImage);
				const imageBytes = new Uint8Array(binaryImage.length);
				for (let index = 0; index < binaryImage.length; index += 1) imageBytes[index] = binaryImage.charCodeAt(index);
				pageImages.push(imageBytes);
			};

			const drawTableRow = (cells, isHeader, rowIndex = 0) => {
				const columnWidth = (canvas.width - margin * 2) / cells.length;
				const font = isHeader ? 'bold 15px Arial, sans-serif' : '15px Arial, sans-serif';
				const wrapped = cells.map(cell => [String(cell || '—')]);
				const rowHeight = isHeader ? 46 : 38;
				if (y + rowHeight > canvas.height - 56) {
					savePage();
					pageIndex += 1;
					startPage();
					if (!isHeader && repeatedHeader) drawTableRow(repeatedHeader, true);
				}
				let right = canvas.width - margin;
				cells.forEach((cell, index) => {
					const left = right - columnWidth;
					context.fillStyle = isHeader ? primaryColor : rowIndex % 2 ? alternateRowColor : '#ffffff';
					context.fillRect(left, y, columnWidth, rowHeight);
					context.strokeStyle = '#dce6e0';
					context.strokeRect(left, y, columnWidth, rowHeight);
					context.fillStyle = isHeader ? '#ffffff' : '#293932';
					context.font = font;
					context.fillText(String(cell || '—'), right - 8, y + 25, columnWidth - 16);
					right = left;
				});
				y += rowHeight;
			};

			startPage();
			reportLines.forEach(line => {
				if (line.cells?.length) {
					if (line.heading) {
						repeatedHeader = line.cells;
						drawTableRow(line.cells, true);
					} else drawTableRow(line.cells, false, line.rowIndex || 0);
					return;
				}
				const text = String(line.text ?? '');
				if (!text.trim()) { y += 16; return; }
				context.font = line.heading ? 'bold 22px Arial, sans-serif' : '17px Arial, sans-serif';
				if (y > canvas.height - 64) {
					savePage();
					pageIndex += 1;
					startPage();
				}
				context.fillStyle = line.heading ? primaryColor : '#26332e';
				context.fillText(text, canvas.width - margin, y);
				y += line.heading ? 38 : 30;
			});
			savePage();

			const pdfParts = [];
			const objectOffsets = [0];
			let pdfLength = 0;
			const append = part => { pdfParts.push(part); pdfLength += part.length; };
			const appendText = text => append(encoder.encode(text));
			appendText('%PDF-1.4\n');
			const objectCount = 2 + pageImages.length * 3;
			const addObject = (objectId, content) => {
				objectOffsets[objectId] = pdfLength;
				appendText(`${objectId} 0 obj\n${content}\nendobj\n`);
			};
			addObject(1, '<< /Type /Catalog /Pages 2 0 R >>');
			addObject(2, `<< /Type /Pages /Kids [${pageImages.map((_, index) => `${3 + index * 3} 0 R`).join(' ')}] /Count ${pageImages.length} >>`);
			pageImages.forEach((imageBytes, index) => {
				const pageId = 3 + index * 3;
				const contentId = pageId + 1;
				const imageId = pageId + 2;
				addObject(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`);
				const content = encoder.encode('q\n842 0 0 595 0 0 cm\n/Im0 Do\nQ');
				objectOffsets[contentId] = pdfLength;
				appendText(`${contentId} 0 obj\n<< /Length ${content.length} >>\nstream\n`);
				append(content);
				appendText('\nendstream\nendobj\n');
				objectOffsets[imageId] = pdfLength;
				appendText(`${imageId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`);
				append(imageBytes);
				appendText('\nendstream\nendobj\n');
			});
			const xrefOffset = pdfLength;
			appendText(`xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`);
			for (let objectId = 1; objectId <= objectCount; objectId += 1) appendText(`${String(objectOffsets[objectId]).padStart(10, '0')} 00000 n \n`);
			appendText(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

			const downloadUrl = URL.createObjectURL(new Blob(pdfParts, { type: 'application/pdf' }));
			const link = document.createElement('a');
			link.href = downloadUrl;
			link.download = `${filename.replace(/[\\/:*?"<>|]/g, '-').trim()}-${getLocalDateValue()}.pdf`;
			document.body.append(link);
			link.click();
			link.remove();
			setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
			showToast('تم تنزيل التقرير بصيغة PDF');
		} catch (error) {
			console.error(error);
			showToast('تعذر إنشاء الملف. تحقق من البيانات والمحاولة مرة أخرى.', true);
		}
	}

	function loadAttendanceRecord(record) {
		if (!record || !Array.isArray(record.employees)) return false;
		attendanceStatusOverrides = [...employeeRows.rows].map(row => {
			const employee = record.employees.find(item => item.name === row.querySelector('.employee-name').textContent);
			return ['paid', 'pending', 'sick', 'review', 'none'].includes(employee?.status) ? employee.status : 'none';
		});
		attendanceDetailsOverrides = [...employeeRows.rows].map((row, index) => {
			const employee = record.employees.find(item => item.name === row.querySelector('.employee-name').textContent);
			return employee ? {
				position: String(employee.position || ''),
				timeIn: /^\d{2}:\d{2}$/.test(employee.timeIn || '') ? employee.timeIn : '',
				timeOut: /^\d{2}:\d{2}$/.test(employee.timeOut || '') ? employee.timeOut : ''
			} : getAttendanceDetails(row, index);
		});
		attendanceMarkedForAll = false;
		return true;
	}

	function getPendingLeaveCount() {
		return leaveRequests.filter(request => request.status === 'pending').length;
	}

	function renderAttendanceResultPanel(status = 'paid') {
		if (sectionView.dataset.view !== 'attendance') return;
		const panel = sectionView.querySelector('#attendanceResultPanel');
		if (!panel) return;
		const label = { paid: 'مريض', pending: 'متأخر', review: 'غائب' }[status] || 'مريض';
		const actualStatuses = getAttendanceStatuses();
		const staff = [...employeeRows.rows].filter((row, index) => actualStatuses[index] === status).map(row => ({
			realIndex: [...employeeRows.rows].findIndex(r => r === row),
			name: row.querySelector('.employee-name').textContent,
			phone: row.querySelector('.employee-phone, .employee-email').textContent,
			department: row.dataset.department || '—',
			hireDate: row.dataset.hireDate || '—'
		}));
		panel.innerHTML = `
			<div class="section-panel" style="margin-top:14px;">
				<div class="section-panel-head"><h2>نتائج ${label}</h2></div>
				<div class="section-table-wrap">
					<table class="section-table"><thead><tr><th>اسم الموظف</th><th>المنصب</th><th>الهاتف</th><th>تاريخ الدخول</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>
						${staff.length ? staff.map(employee => `<tr><td>${employee.name}</td><td>${employee.department}</td><td>${employee.phone}</td><td>${employee.hireDate}</td><td><span class="attendance-status" data-attendance-status="${status}">${label}</span></td><td><button type="button" class="delete-attendance-button" data-attendance-delete="${employee.realIndex}" data-attendance-status="${status}">حذف</button></td></tr>`).join('') : '<tr><td colspan="6">لا يوجد موظفون في هذه الفئة.</td></tr>'}
					</tbody></table>
				</div>
			</div>
		`;
	}

	function getLeaveRequestCount() {
		return leaveRequests.length;
	}

	function calculateLeaveDays(fromDate, toDate) {
		if (!fromDate || !toDate) return 0;
		const start = new Date(fromDate);
		const end = new Date(toDate);
		if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
		const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
		return diff >= 0 ? diff + 1 : 0;
	}

	function getEmployeeRemainingLeaves(employeeName) {
		const approvedDays = leaveRequests.filter(r => r.employee === employeeName && r.status === 'approved').reduce((t, r) => t + (r.days || 0), 0);
		return Math.max(0, 30 - approvedDays);
	}

	function renderLeaveRows() {
		const tbody = sectionView.querySelector('#leaveRequestsTableBody');
		if (!tbody) return;
		tbody.replaceChildren();
		if (!leaveRequests.length) {
			tbody.innerHTML = '<tr><td colspan="6">لا توجد طلبات إجازة مسجلة.</td></tr>';
		} else {
			leaveRequests.forEach((request, index) => {
				const row = document.createElement('tr');
				const statusClass = request.status === 'approved' ? 'paid' : request.status === 'rejected' ? 'review' : 'pending';
				const statusLabel = request.status === 'pending' ? 'قيد المراجعة' : request.status === 'approved' ? 'معتمدة' : 'مرفوضة';
				const remainingDays = getEmployeeRemainingLeaves(request.employee);
				const canApprove = request.status === 'pending' && remainingDays >= (request.days || 0);
				row.innerHTML = `
					<td>${request.employee}</td>
					<td>${request.type}</td>
					<td>${request.fromDate || '—'}</td>
					<td>${request.toDate || '—'}</td>
					<td>${request.days || 0}</td>
					<td>
						<span class="status ${statusClass}">${statusLabel}</span>
						<div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">
							<button type="button" class="action-button approve" data-leave-action="approve" data-leave-index="${index}" ${!canApprove || request.status !== 'pending' ? 'disabled' : ''}>موافق</button>
							<button type="button" class="action-button reject" data-leave-action="reject" data-leave-index="${index}" ${request.status !== 'pending' ? 'disabled' : ''}>رفض</button>
							<button type="button" class="action-button reject" data-leave-action="delete" data-leave-index="${index}">حذف</button>
						</div>
					</td>
				`;
				tbody.append(row);
			});
		}
	}

	function getMoroccoHolidays(year) {
		const fixedHolidays = [
			{ name: 'رأس السنة الميلادية', month: 1, day: 1 },
			{ name: 'ذكرى تقديم وثيقة الاستقلال', month: 1, day: 11 },
			{ name: 'عيد الشغل', month: 5, day: 1 },
			{ name: 'عيد العرش', month: 7, day: 30 },
			{ name: 'ذكرى استرجاع وادي الذهب', month: 8, day: 14 },
			{ name: 'ذكرى ثورة الملك والشعب', month: 8, day: 20 },
			{ name: 'عيد الشباب', month: 8, day: 21 },
			{ name: 'ذكرى المسيرة الخضراء', month: 11, day: 6 },
			{ name: 'عيد الاستقلال', month: 11, day: 18 }
		].map(holiday => ({
			...holiday,
			type: 'وطني',
			date: `${year}-${String(holiday.month).padStart(2, '0')}-${String(holiday.day).padStart(2, '0')}`,
			note: 'عطلة رسمية'
		}));
		const religiousHolidays = [
			{ name: 'فاتح محرم (رأس السنة الهجرية)', duration: 'يوم واحد' },
			{ name: 'عيد المولد النبوي الشريف', duration: 'يومان' },
			{ name: 'عيد الفطر', duration: 'يومان' },
			{ name: 'عيد الأضحى', duration: 'يومان' }
		].flatMap(holiday => {
			const dates = religiousHolidayDatesByYear[year]?.[holiday.name] || [];
			return (dates.length ? dates : ['حسب الإعلان الرسمي']).map((date, index) => ({
				...holiday,
				type: 'ديني',
				date,
				note: dates.length > 1 ? `${holiday.duration} (${index + 1}/${dates.length})` : holiday.duration
			}));
		});
		return [...fixedHolidays, ...religiousHolidays];
	}

	function getHolidaysTableHtml(year) {
		const holidays = getMoroccoHolidays(year);
		const holidayRows = holidays.map(holiday => `
			<tr>
				<td>${holiday.name}</td>
				<td>${holiday.type}</td>
				<td>${holiday.date}</td>
				<td>${holiday.note}</td>
			</tr>
		`).join('');
		return `
			<div class="section-panel-head">
				<h2>العطل الوطنية والدينية في المغرب - ${year}</h2>
				<span class="panel-count">${holidays.length} عطلة</span>
			</div>
			<div class="section-table-wrap">
				<table class="section-table">
					<thead><tr><th>اسم العطلة</th><th>النوع</th><th>التاريخ</th><th>ملاحظات</th></tr></thead>
					<tbody>${holidayRows}</tbody>
				</table>
			</div>
			<div class="section-note">تواريخ العطل الدينية تقريبية ويتم تأكيدها بالإعلان الرسمي بالمملكة المغربية.</div>
		`;
	}

	function isPriorityScheduleEmployee(name) {
		const normalizedName = String(name).toLocaleLowerCase('en').replace(/[^a-z0-9]+/g, ' ').trim();
		return ['ahmed', 'abdalah', 'abdlmohaimin', 'abdolmohaimin', 'saif din', 'bilal', 'oussama', 'yassin', 'walid', 'brahim', 'ibrahim']
			.some(namePart => ` ${normalizedName} `.includes(` ${namePart} `));
	}

	function getCuisineShiftForDate(date, rotationIndex) {
		const day = new Date(`${date}T12:00:00`).getDay();
		const shiftsByDay = {
			0: ['10H00/19H00', '19H00/03H00'],
			1: ['10H00/18H00', '18H00/02H00'],
			2: ['10H00/18H00', '18H00/02H00'],
			3: ['10H00/18H00', '18H00/02H00'],
			4: ['10H00/18H00', '18H00/02H00'],
			5: ['12H00/20H00', '20H00/04H00'],
			6: ['10H00/19H00', '19H00/04H00']
		};
		return shiftsByDay[day][rotationIndex % 2];
	}

	function fillAllWeeklySchedule(dates) {
		const allRotations = new Map([...employeeRows.rows].map(row => row.dataset.employeeId).sort().map((employeeId, index) => [employeeId, index]));
		let changed = false;
		[...employeeRows.rows].forEach(row => {
			const employeeId = row.dataset.employeeId;
			const rotationIndex = allRotations.get(employeeId) || 0;
			dates.forEach(date => {
				if (!weeklySchedule[date]) weeklySchedule[date] = {};
				if (!weeklySchedule[date][employeeId]) {
					weeklySchedule[date][employeeId] = getCuisineShiftForDate(date, rotationIndex);
					changed = true;
				}
			});
		});
		if (changed) persistLocalDatabase();
	}

	function renderHolidaysView() {
		const year = new Date().getFullYear();
		const holidays = getMoroccoHolidays(year);
		const nationalHolidays = holidays.filter(holiday => holiday.type === 'وطني');
		const religiousHolidays = holidays.filter(holiday => holiday.type === 'ديني');
		const options = Array.from({ length: 5 }, (unused, index) => year + 3 - index).map(value => `<option value="${value}" ${value === year ? 'selected' : ''}>${value}</option>`).join('');
		sectionView.innerHTML = `
			<div class="section-toolbar"><div><h1>العطل الرسمية</h1><p class="subtitle">العطل الوطنية والدينية الرسمية في المغرب المطبقة على الموظفين.</p></div></div>
			<div class="summary-grid">
				<article class="summary-card" style="background:linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);"><div class="summary-top"><span>عطلة وطنية</span><span class="summary-icon"><i data-lucide="flag"></i></span></div><div class="summary-value">${nationalHolidays.length}</div><div class="summary-note">تواريخ ثابتة كل سنة</div></article>
				<article class="summary-card" style="background:linear-gradient(135deg, #e1f5fe 0%, #b3e5fc 100%);"><div class="summary-top"><span>عطلة دينية</span><span class="summary-icon"><i data-lucide="moon-star"></i></span></div><div class="summary-value">${religiousHolidays.length}</div><div class="summary-note">حسب الإعلان الرسمي</div></article>
				<article class="summary-card" style="background:linear-gradient(135deg, #f1f8e9 0%, #dcedc8 100%);"><div class="summary-top"><span>إجمالي العطل</span><span class="summary-icon"><i data-lucide="party-popper"></i></span></div><div class="summary-value">${holidays.length}</div><div class="summary-note">لسنة ${year}</div></article>
				<article class="summary-card" style="background:linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%);"><div class="summary-top"><span>الموظفون المستفيدون</span><span class="summary-icon"><i data-lucide="users-round"></i></span></div><div class="summary-value">${employeeRows.rows.length}</div><div class="summary-note">يشمل جميع الموظفين</div></article>
			</div>
			<div class="section-panel"><div class="section-panel-head"><h2>سنة العطل</h2><select id="holidayYear">${options}</select></div><div class="section-note">التواريخ الوطنية ثابتة كل سنة.</div></div>
			<div class="section-panel" id="moroccoHolidayCalendar">${getHolidaysTableHtml(year)}</div>
		`;
		if (window.lucide) lucide.createIcons({ nodes: [sectionView] });
	}

	function renderWeeklyPlanning() {
		const employeeList = [...employeeRows.rows].map(row => ({
			id: row.dataset.employeeId,
			name: row.querySelector('.employee-name').textContent,
			isPriority: isPriorityScheduleEmployee(row.querySelector('.employee-name').textContent)
		}));
		sectionView.innerHTML = `
			<div class="section-toolbar"><div><h1>التخطيط الأسبوعي</h1><p class="subtitle">جدول أسبوعي لتوزيع المهام أو الورديات على الموظفين.</p></div><button type="button" class="secondary-button" data-action="export-weekly-planning"><i data-lucide="download"></i><span>تنزيل التخطيط الأسبوعي PDF</span></button></div>
			<div class="section-panel">
				<div class="section-panel-head weekly-planning-controls">
					<div><h2>الأسبوع (من الاثنين إلى الأحد)</h2><p class="subtitle">اختر أي تاريخ لعرض الأسبوع الذي يقع فيه.</p></div>
					<div class="week-picker">
						<button type="button" class="action-button" data-schedule-offset="-7" aria-label="أسبوع سابق"><i data-lucide="chevron-right"></i></button>
						<input type="date" data-schedule-week value="${selectedScheduleWeek}" aria-label="الأسبوع">
						<button type="button" class="action-button" data-schedule-offset="7" aria-label="أسبوع تالٍ"><i data-lucide="chevron-left"></i></button>
						<button type="button" class="primary-button" data-action="save-weekly-planning" aria-label="حفظ التخطيط"><i data-lucide="save"></i><span>حفظ الجداول</span></button>
					</div>
				</div>
				<div class="section-table-wrap" id="weeklyPlanningTableWrap"></div>
				<div class="section-note">تُملأ خانات التوقيت تلقائيًا لموظفي CUISINE وباقي الأقسام، ويمكن تعديلها يدويًا أو اختيار راحة / إجازة.</div>
			</div>`;

		const weekDates = [];
		for (let day = 0; day < 7; day += 1) weekDates.push(addDaysToDate(selectedScheduleWeek, day));
		fillAllWeeklySchedule(weekDates);
		const tableWrap = sectionView.querySelector('#weeklyPlanningTableWrap');

		const renderScheduleGroup = (title, employees) => {
			const group = document.createElement('section');
			group.className = 'weekly-schedule-group';
			if (title) {
				const heading = document.createElement('h3');
				heading.textContent = title;
				group.append(heading);
			}
			const table = document.createElement('table');
			table.className = 'section-table weekly-schedule-table';
			const head = document.createElement('thead');
			const headerRow = document.createElement('tr');
			const empHeader = document.createElement('th');
			empHeader.textContent = 'اسم الموظف';
			headerRow.append(empHeader);
			weekDates.forEach(dateValue => {
				const th = document.createElement('th');
				const d = new Date(`${dateValue}T12:00:00`);
				th.textContent = new Intl.DateTimeFormat('ar-MA', { weekday: 'long', day: 'numeric', month: 'short' }).format(d);
				headerRow.append(th);
			});
			head.append(headerRow);
			table.append(head);

			const body = document.createElement('tbody');
			employees.forEach(employee => {
				const row = document.createElement('tr');
				const nameTd = document.createElement('td');
				nameTd.textContent = employee.name;
				row.append(nameTd);
				weekDates.forEach(dateValue => {
					const cell = document.createElement('td');
					const select = document.createElement('select');
					select.className = 'weekly-schedule-input';
					select.dataset.scheduleDate = dateValue;
					select.dataset.employeeId = employee.id;
					const currentVal = weeklySchedule[dateValue]?.[employee.id] || '';
					const shifts = ['10H00/19H00', '19H00/03H00', '10H00/18H00', '18H00/02H00', '12H00/20H00', '20H00/04H00', '19H00/04H00', 'REST', 'OFF', ''];
					const labels = {
						'': 'اختر التوقيت',
						'10H00/19H00': '10:00 - 19:00',
						'19H00/03H00': '19:00 - 03:00',
						'10H00/18H00': '10:00 - 18:00',
						'18H00/02H00': '18:00 - 02:00',
						'12H00/20H00': '12:00 - 20:00',
						'20H00/04H00': '20:00 - 04:00',
						'19H00/04H00': '19:00 - 04:00',
						'REST': '☀️ راحة',
						'OFF': '🌙 إجازة'
					};
					shifts.forEach(shift => {
						const opt = document.createElement('option');
						opt.value = shift;
						opt.textContent = labels[shift] || shift;
						if (shift === currentVal) opt.selected = true;
						select.append(opt);
					});
					if (currentVal === 'OFF' || currentVal === 'REST') select.classList.add('schedule-off');
					cell.append(select);
					row.append(cell);
				});
				body.append(row);
			});
			table.append(body);
			group.append(table);
			tableWrap.append(group);
		};

		renderScheduleGroup('🍳 POSTE CUISINE', employeeList.filter(e => e.isPriority));
		renderScheduleGroup('👥 باقي الموظفين', employeeList.filter(e => !e.isPriority));
		if (window.lucide) lucide.createIcons({ nodes: [sectionView] });
	}

	function renderAttendanceRecords() {
		const dates = Object.keys(attendanceHistory).sort().reverse();
		const summaryHTML = dates.slice(0, 5).map(date => {
			const record = attendanceHistory[date];
			const present = record.employees?.filter(e => e.status === 'paid').length || 0;
			const absent = record.employees?.filter(e => e.status === 'review').length || 0;
			const late = record.employees?.filter(e => e.status === 'pending').length || 0;
			return `<div style="padding:12px;margin:8px 0;background:#f9f9f9;border-right:4px solid #28688e;border-radius:4px;"><div style="display:flex;justify-content:space-between;"><strong>${date}</strong><span>${record.employees?.length || 0} موظف</span></div><div style="display:flex;gap:12px;margin-top:6px;font-size:12px;"><span>🟢 حاضر: ${present}</span><span>🔴 غائب: ${absent}</span><span>🟡 متأخر: ${late}</span></div></div>`;
		}).join('');

		sectionView.innerHTML = `
			<div class="section-toolbar"><div><h1>سجل الحضور اليومي</h1><p class="subtitle">أرشيف حضور الموظفين والغيابات حسب التاريخ.</p></div></div>
			<div class="section-panel"><div class="section-panel-head"><h2>آخر السجلات المحفوظة</h2></div><div style="padding:16px;">${summaryHTML || '<p style="color:#999;">لا توجد سجلات حضور مسجلة بعد</p>'}</div></div>
		`;
		if (window.lucide) lucide.createIcons({ nodes: [sectionView] });
	}

	function getLocalDateValue() {
		const date = new Date();
		date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
		return date.toISOString().slice(0, 10);
	}

	function getWeekStartDate(dateValue) {
		const date = new Date(`${dateValue}T12:00:00`);
		date.setDate(date.getDate() - (date.getDay() + 6) % 7);
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
	}

	function addDaysToDate(dateValue, days) {
		const date = new Date(`${dateValue}T12:00:00`);
		date.setDate(date.getDate() + days);
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
	}

	function createEmployeeId() {
		return `employee-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	}

	function getCurrentMonthKey() { return getLocalDateValue().slice(0, 7); }

	function formatMonthLabel(month) {
		const [year, monthNumber] = month.split('-').map(Number);
		return new Intl.DateTimeFormat('ar-MA', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
	}

	function getAvailableMonthKeys() {
		const months = new Set([getCurrentMonthKey(), ...monthlyArchives.map(archive => archive.month)]);
		return [...months].sort((a, b) => b.localeCompare(a));
	}

	function updateMonthOptions() {
		const options = getAvailableMonthKeys().map(month => `<option value="${month}">${formatMonthLabel(month)}</option>`).join('');
		const select = document.getElementById('monthSelect');
		if (select) {
			select.innerHTML = options;
			select.value = selectedMonth;
		}
	}

	function calculatePayrollRow(row) {
		const getValue = field => Number(row.querySelector(`[data-field="${field}"]`)?.value) || 0;
		const salary = Math.max(0, Number(row.dataset.salary) || 0);
		const advance = Math.max(0, getValue('advance'));
		const absenceDays = Math.max(0, Math.floor(getValue('absenceDays')));
		const misAPiedDays = Math.max(0, Math.floor(getValue('misAPiedDays')));
		const extraDays = Math.max(0, Math.floor(getValue('extraDays')));
		const restDays = Math.max(0, Math.floor(getValue('restDays')));
		const sickDays = Math.max(0, Math.floor(getValue('sickDays')));
		const dailySalary = salary / 26;
		const hourlySalary = dailySalary / 8;
		const workDays = Math.max(0, 26 - absenceDays - sickDays - misAPiedDays + extraDays + restDays);
		const netSalary = salary - advance - dailySalary * (absenceDays + sickDays + misAPiedDays) + dailySalary * (extraDays + restDays);
		Object.assign(row.dataset, { salary, advance, absenceDays, misAPiedDays, extraDays, restDays, sickDays, workDays, netSalary });
		row.querySelector('[data-result="daily"]').textContent = formatPayrollAmount(dailySalary);
		row.querySelector('[data-result="hourly"]').textContent = formatPayrollAmount(hourlySalary);
		row.querySelector('[data-result="workDays"]').textContent = workDays;
		row.querySelector('[data-result="net"]').textContent = formatPayrollAmount(netSalary);
	}

	function employeeFromRow(row) {
		return {
			id: row.dataset.employeeId,
			name: row.querySelector('.employee-name').textContent,
			phone: row.querySelector('.employee-phone, .employee-email').textContent,
			nationalId: row.dataset.nationalId || '',
			hireDate: row.dataset.hireDate || '',
			avatar: row.querySelector('.employee-avatar').textContent,
			department: row.dataset.department || '',
			salary: Number(row.dataset.salary) || 0,
			advance: Number(row.dataset.advance) || 0,
			absenceDays: Number(row.dataset.absenceDays) || 0,
			misAPiedDays: Number(row.dataset.misAPiedDays) || 0,
			extraDays: Number(row.dataset.extraDays) || 0,
			restDays: Number(row.dataset.restDays) || 0,
			sickDays: Number(row.dataset.sickDays) || 0,
			status: row.dataset.status
		};
	}

	function createPayrollInput(field, value, label, isDays = false) {
		const input = document.createElement('input');
		input.className = `payroll-input${isDays ? ' days' : ''}`;
		input.type = 'number';
		input.min = '0';
		input.step = isDays ? '1' : '0.01';
		input.value = Number(value) || 0;
		input.dataset.field = field;
		input.setAttribute('aria-label', label);
		return input;
	}

	function createMoneyInputCell(field, value, label) {
		const cell = document.createElement('td');
		const wrapper = document.createElement('div');
		wrapper.className = 'payroll-input-wrap';
		wrapper.append(createPayrollInput(field, value, label));
		const currency = document.createElement('span');
		currency.className = 'currency';
		currency.textContent = currencyLabel;
		wrapper.append(currency);
		cell.append(wrapper);
		return cell;
	}

	function createDaysInputCell(field, value, label) {
		const cell = document.createElement('td');
		cell.append(createPayrollInput(field, value, label, true));
		return cell;
	}

	function createPayrollResultCell(field, isMoney = false) {
		const cell = document.createElement('td');
		const result = document.createElement('span');
		result.className = `payroll-result${field === 'net' ? ' net' : ''}`;
		result.dataset.result = field;
		cell.append(result);
		if (isMoney) {
			const currency = document.createElement('span');
			currency.className = 'currency';
			currency.textContent = ` ${currencyLabel}`;
			cell.append(currency);
		}
		return cell;
	}

	function createPayrollRow(employee) {
		const row = document.createElement('tr');
		row.dataset.employeeId = employee.id || createEmployeeId();
		row.dataset.status = employee.status || 'pending';
		row.dataset.hireDate = employee.hireDate || '';
		row.dataset.department = employee.department || '';
		row.dataset.nationalId = employee.nationalId || '';
		row.dataset.salary = employee.salary || 0;

		const empCell = document.createElement('td');
		const empInfo = document.createElement('div');
		empInfo.className = 'employee';
		const avatar = document.createElement('div');
		avatar.className = 'employee-avatar';
		avatar.textContent = employee.avatar || employee.name.slice(0, 2);
		const idCol = document.createElement('div');
		const name = document.createElement('div');
		name.className = 'employee-name';
		name.textContent = employee.name;
		const phone = document.createElement('div');
		phone.className = 'employee-phone';
		phone.textContent = employee.phone || '—';
		idCol.append(name, phone);
		empInfo.append(avatar, idCol);
		empCell.append(empInfo);
		row.append(empCell);

		const salaryCell = document.createElement('td');
		salaryCell.innerHTML = `<span class="payroll-result">${formatPayrollAmount(employee.salary)}</span> <span class="currency">${currencyLabel}</span>`;
		row.append(salaryCell);

		row.append(createMoneyInputCell('advance', employee.advance, `التسبيق لـ ${employee.name}`));
		row.append(createPayrollResultCell('daily', true));
		row.append(createPayrollResultCell('hourly', true));
		row.append(createDaysInputCell('absenceDays', employee.absenceDays, `أيام غياب ${employee.name}`));
		row.append(createDaysInputCell('misAPiedDays', employee.misAPiedDays || 0, `أيام mis a pied لـ ${employee.name}`));
		row.append(createDaysInputCell('extraDays', employee.extraDays, `الأيام الإضافية لـ ${employee.name}`));
		row.append(createDaysInputCell('restDays', employee.restDays, `أيام الراحة لـ ${employee.name}`));
		row.append(createDaysInputCell('sickDays', employee.sickDays, `أيام مرض ${employee.name}`));
		row.append(createPayrollResultCell('workDays'));
		row.append(createPayrollResultCell('net', true));
		calculatePayrollRow(row);
		return row;
	}

	const initialSeedEmployees = [
		{ id: 'emp-1', name: 'أحمد الإدريسي', phone: '+212 661 112233', nationalId: 'AB123456', hireDate: '2023-01-15', department: 'POST CUISINE', salary: 8500, advance: 500, absenceDays: 0, misAPiedDays: 0, extraDays: 1, restDays: 0, sickDays: 0, avatar: 'أإ', status: 'paid' },
		{ id: 'emp-2', name: 'عبد الله التازي', phone: '+212 662 223344', nationalId: 'CD234567', hireDate: '2023-03-01', department: 'POST CUISINE', salary: 7800, advance: 0, absenceDays: 1, misAPiedDays: 0, extraDays: 0, restDays: 0, sickDays: 0, avatar: 'عت', status: 'paid' },
		{ id: 'emp-3', name: 'عبد المهيمن العلمي', phone: '+212 663 334455', nationalId: 'EF345678', hireDate: '2023-05-10', department: 'POST CUISINE', salary: 8000, advance: 300, absenceDays: 0, misAPiedDays: 0, extraDays: 2, restDays: 0, sickDays: 0, avatar: 'عم', status: 'pending' },
		{ id: 'emp-4', name: 'سيف الدين بنسودة', phone: '+212 664 445566', nationalId: 'GH456789', hireDate: '2023-06-20', department: 'POST CUISINE', salary: 7500, advance: 0, absenceDays: 0, misAPiedDays: 0, extraDays: 0, restDays: 0, sickDays: 0, avatar: 'سب', status: 'paid' },
		{ id: 'emp-5', name: 'بلال المرابط', phone: '+212 665 556677', nationalId: 'JK567890', hireDate: '2023-08-15', department: 'POST CUISINE', salary: 7200, advance: 0, absenceDays: 0, misAPiedDays: 0, extraDays: 0, restDays: 0, sickDays: 1, avatar: 'بم', status: 'pending' },
		{ id: 'emp-6', name: 'أسامة الفاسي', phone: '+212 666 667788', nationalId: 'LM678901', hireDate: '2023-09-01', department: 'POST CUISINE', salary: 7000, advance: 200, absenceDays: 0, misAPiedDays: 0, extraDays: 0, restDays: 0, sickDays: 0, avatar: 'أف', status: 'paid' },
		{ id: 'emp-7', name: 'ياسين الوردي', phone: '+212 667 778899', nationalId: 'NP789012', hireDate: '2023-11-05', department: 'BAR', salary: 6500, advance: 0, absenceDays: 0, misAPiedDays: 0, extraDays: 0, restDays: 0, sickDays: 0, avatar: 'يو', status: 'paid' },
		{ id: 'emp-8', name: 'وليد الصنهاجي', phone: '+212 668 889900', nationalId: 'QR890123', hireDate: '2024-01-10', department: 'CAISSE', salary: 6800, advance: 400, absenceDays: 0, misAPiedDays: 0, extraDays: 1, restDays: 0, sickDays: 0, avatar: 'وص', status: 'paid' },
		{ id: 'emp-9', name: 'إبراهيم الناصري', phone: '+212 669 990011', nationalId: 'ST901234', hireDate: '2024-02-15', department: 'SERVEC', salary: 6200, advance: 0, absenceDays: 2, misAPiedDays: 0, extraDays: 0, restDays: 0, sickDays: 0, avatar: 'إن', status: 'review' },
		{ id: 'emp-10', name: 'فاطمة الزهراء العلوي', phone: '+212 670 001122', nationalId: 'UV012345', hireDate: '2024-03-01', department: 'MENAGE', salary: 5500, advance: 0, absenceDays: 0, misAPiedDays: 0, extraDays: 0, restDays: 0, sickDays: 0, avatar: 'فع', status: 'paid' }
	];

	function persistLocalDatabase() {
		try {
			const data = {
				version: 1,
				religiousHolidayDatesByYear,
				holidayGridAssignments,
				holidayGridAnnualValues,
				selectedScheduleWeek,
				weeklySchedule,
				employees: [...employeeRows.rows].map(employeeFromRow),
				deletedEmployees,
				leaveRequests,
				leaveRequestStatuses,
				attendanceMarkedForAll,
				attendanceStatuses: getAttendanceStatuses(),
				attendanceDetails: [...employeeRows.rows].map((row, index) => getAttendanceDetails(row, index)),
				lastAttendanceRegistration,
				attendanceHistory,
				selectedMonth,
				selectedReportMonths,
				reportMonth,
				monthlyArchives,
				saveHistory
			};
			localStorage.setItem(localDatabaseKey, JSON.stringify(data));
			legacyHRData = data;
			if (window.ObayoliCloud && typeof window.ObayoliCloud.saveState === 'function') {
				window.ObayoliCloud.saveState('hr', structuredClone(data), remoteRevision).then(res => {
					if (res && res.revision) remoteRevision = res.revision;
				}).catch(e => console.warn(e));
			}
			return true;
		} catch (error) {
			console.error('Storage error:', error);
			return false;
		}
	}

	function restoreLocalDatabase(remoteData = null) {
		try {
			let data = remoteData;
			if (!data) {
				const saved = localStorage.getItem(localDatabaseKey) || localStorage.getItem('obayoli-hr-local-v1');
				if (saved) data = JSON.parse(saved);
			}
			if (!data || !Array.isArray(data.employees) || data.employees.length === 0) {
				// Seed initial employees for a fresh start!
				employeeRows.replaceChildren(...initialSeedEmployees.map(createPayrollRow));
				leaveRequests = [
					{ employee: 'عبد المهيمن العلمي', type: 'سنوية', fromDate: '2026-11-01', toDate: '2026-11-05', days: 5, status: 'pending' },
					{ employee: 'وليد الصنهاجي', type: 'مرضية', fromDate: '2026-10-10', toDate: '2026-10-12', days: 3, status: 'approved' }
				];
				persistLocalDatabase();
				return;
			}
			employeeRows.replaceChildren(...data.employees.map(createPayrollRow));
			if (Array.isArray(data.leaveRequests)) leaveRequests = data.leaveRequests;
			if (data.weeklySchedule) weeklySchedule = data.weeklySchedule;
			if (data.attendanceHistory) attendanceHistory = data.attendanceHistory;
			if (data.selectedScheduleWeek) selectedScheduleWeek = data.selectedScheduleWeek;
			if (Array.isArray(data.saveHistory)) saveHistory = data.saveHistory;
		} catch (e) {
			console.warn(e);
		}
	}

	function filterRows() {
		const query = searchInput.value.trim().toLocaleLowerCase('ar');
		const matchingRows = [...employeeRows.rows].filter(row => row.querySelector('.employee-name').textContent.toLocaleLowerCase('ar').includes(query));
		const pageCount = Math.max(1, Math.ceil(matchingRows.length / pageSize));
		currentPage = Math.min(currentPage, pageCount);
		const start = (currentPage - 1) * pageSize;
		const pageRows = new Set(matchingRows.slice(start, start + pageSize));
		[...employeeRows.rows].forEach(row => { row.hidden = !pageRows.has(row); });
		emptyState.style.display = matchingRows.length ? 'none' : 'block';
		document.getElementById('shownCount').textContent = `${matchingRows.length} موظفاً`;
		document.getElementById('tableInfo').textContent = matchingRows.length
			? `عرض ${start + 1}-${Math.min(start + pageSize, matchingRows.length)} من أصل ${matchingRows.length} موظفاً`
			: 'لا يوجد موظفون مطابقون';
		const paginationPages = document.getElementById('paginationPages');
		paginationPages.replaceChildren();
		for (let page = 1; page <= pageCount; page++) {
			const button = document.createElement('button');
			button.className = `page-button${page === currentPage ? ' current' : ''}`;
			button.textContent = page;
			button.addEventListener('click', () => { currentPage = page; filterRows(); });
			paginationPages.append(button);
		}
		document.getElementById('previousPage').disabled = currentPage === 1;
		document.getElementById('nextPage').disabled = currentPage === pageCount;
	}

	function renderView(view) {
		navItems.forEach(item => {
			const active = item.dataset.view === view;
			item.classList.toggle('active', active);
			if (active) item.setAttribute('aria-current', 'page');
			else item.removeAttribute('aria-current');
		});
		document.getElementById('breadcrumbCurrent').textContent = pageTitles[view] || view;
		payrollSections.forEach(section => { section.hidden = view !== 'payroll'; });
		sectionView.hidden = view === 'payroll';
		if (view === 'payroll') return;

		if (view === 'home') {
			const paidCount = getPaidEmployeeCount();
			const totalEmps = employeeRows.rows.length;
			const totalNet = getTotalNetSalary();
			const totalAdvances = getTotalAdvances();
			const totalSalary = getTotalMonthlySalary();
			const paidPercent = totalEmps ? Math.round((paidCount / totalEmps) * 100) : 0;

			sectionView.innerHTML = `
				<div class="section-toolbar">
					<div>
						<h1>لوحة التحكم الرئيسية</h1>
						<p class="subtitle">نظرة استراتيجية شاملة على حركة الموظفين ومستحقات الرواتب والحضور اليومي.</p>
					</div>
					<div style="display:flex;gap:10px;">
						<button class="secondary-button" data-open-view="reports"><i data-lucide="bar-chart-3"></i><span>التقارير المالية</span></button>
						<button class="primary-button" data-open-view="payroll"><i data-lucide="wallet"></i><span>مسير الرواتب</span></button>
					</div>
				</div>

				<div class="summary-grid">
					<article class="summary-card card-green">
						<div class="summary-top"><span>إجمالي الموظفين</span><span class="summary-icon"><i data-lucide="users-round"></i></span></div>
						<div class="summary-value">${totalEmps}</div>
						<div class="summary-note">سجل نشط في المؤسسة</div>
					</article>
					<article class="summary-card card-orange">
						<div class="summary-top"><span>مجموع الرواتب الشهرية</span><span class="summary-icon"><i data-lucide="wallet-cards"></i></span></div>
						<div class="summary-value">${formatPayrollAmount(totalSalary)} <span class="currency">${currencyLabel}</span></div>
						<div class="summary-note">إجمالي الرواتب الأساسية</div>
					</article>
					<article class="summary-card card-blue">
						<div class="summary-top"><span>صافي المستحقات الحالية</span><span class="summary-icon"><i data-lucide="banknote"></i></span></div>
						<div class="summary-value">${formatPayrollAmount(totalNet)} <span class="currency">${currencyLabel}</span></div>
						<div class="summary-note">بعد خصم الغيابات والتسبيقات</div>
					</article>
					<article class="summary-card card-red" data-open-view="leaves" style="cursor:pointer;">
						<div class="summary-top"><span>طلبات إجازة معلقة</span><span class="summary-icon"><i data-lucide="clipboard-list"></i></span></div>
						<div class="summary-value" id="pendingLeaveCount">${getPendingLeaveCount()}</div>
						<div class="summary-note">بانتظار مصادقة الإدارة</div>
					</article>
				</div>

				<div class="section-panel" style="margin-bottom:24px;padding:22px 24px;">
					<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
						<div>
							<h3 style="margin:0;font-size:15px;font-weight:700;">مؤشر تقدم صرف الرواتب</h3>
							<p style="margin:4px 0 0;font-size:12px;color:var(--muted);">تم صرف ${paidCount} من أصل ${totalEmps} موظف (${paidPercent}%)</p>
						</div>
						<span style="font-weight:700;font-size:16px;color:var(--brand-700);">${paidPercent}%</span>
					</div>
					<div style="width:100%;height:10px;background:#e2e8f0;border-radius:10px;overflow:hidden;">
						<div style="width:${paidPercent}%;height:100%;background:linear-gradient(90deg, #10b981 0%, #059669 100%);border-radius:10px;transition:width 0.4s ease;"></div>
					</div>
				</div>

				<div class="section-panel">
					<div class="section-panel-head">
						<h2>الوصول السريع للخدمات</h2>
					</div>
					<div class="shortcut-grid" style="padding:18px">
						<button class="shortcut-button" data-open-view="employees"><i data-lucide="users"></i><span>دليل الموظفين</span></button>
						<button class="shortcut-button" data-open-view="attendance"><i data-lucide="calendar-check-2"></i><span>متابعة الحضور</span></button>
						<button class="shortcut-button" data-open-view="planning"><i data-lucide="calendar-range"></i><span>التخطيط الأسبوعي</span></button>
						<button class="shortcut-button" data-open-view="holidays"><i data-lucide="party-popper"></i><span>العطل الرسمية</span></button>
					</div>
				</div>`;
		} else if (view === 'employees') {
			sectionView.innerHTML = `
				<div class="section-toolbar">
					<div>
						<h1>دليل الموظفين</h1>
						<p class="subtitle">إدارة بيانات الموظفين وعقود العمل والرواتب المسجلة.</p>
					</div>
					<button class="primary-button" data-action="add-employee"><i data-lucide="user-plus"></i><span>إضافة موظف جديد</span></button>
				</div>
				<div class="section-panel">
					<div class="section-panel-head">
						<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
							<h2>قائمة الموظفين</h2>
							<div style="display:flex;gap:6px;" id="deptFilterGroup">
								<button class="page-button current" data-dept-filter="all" style="min-width:auto;padding:0 12px;font-size:12px;">الكل</button>
								<button class="page-button" data-dept-filter="POST CUISINE" style="min-width:auto;padding:0 12px;font-size:12px;">CUISINE</button>
								<button class="page-button" data-dept-filter="BAR" style="min-width:auto;padding:0 12px;font-size:12px;">BAR</button>
								<button class="page-button" data-dept-filter="CAISSE" style="min-width:auto;padding:0 12px;font-size:12px;">CAISSE</button>
								<button class="page-button" data-dept-filter="MENAGE" style="min-width:auto;padding:0 12px;font-size:12px;">MENAGE</button>
								<button class="page-button" data-dept-filter="SERVEC" style="min-width:auto;padding:0 12px;font-size:12px;">SERVEC</button>
							</div>
						</div>
						<div class="panel-actions">
							<div class="search-box">
								<i data-lucide="search"></i>
								<input id="directorySearch" type="search" placeholder="ابحث بالاسم أو المنصب..." aria-label="ابحث بالاسم">
							</div>
						</div>
					</div>
					<div class="section-table-wrap">
						<table class="section-table">
							<thead>
								<tr>
									<th>الموظف</th>
									<th>POSTE</th>
									<th>رقم الهاتف</th>
									<th>رقم البطاقة</th>
									<th>تاريخ الدخول</th>
									<th>الراتب الأساسي</th>
									<th>الإجراءات</th>
								</tr>
							</thead>
							<tbody id="directoryRows"></tbody>
						</table>
					</div>
				</div>`;
			const tbody = sectionView.querySelector('#directoryRows');
			[...employeeRows.rows].forEach((row, index) => {
				const tr = document.createElement('tr');
				tr.dataset.department = row.dataset.department || '';
				tr.dataset.search = `${row.querySelector('.employee-name').textContent} ${row.dataset.department}`.toLocaleLowerCase('ar');
				tr.innerHTML = `
					<td>
						<div class="employee">
							<div class="employee-avatar">${row.querySelector('.employee-avatar').textContent}</div>
							<div>
								<div class="employee-name">${row.querySelector('.employee-name').textContent}</div>
								<div class="employee-phone">${row.querySelector('.employee-phone').textContent}</div>
							</div>
						</div>
					</td>
					<td><span style="font-weight:600;padding:3px 8px;border-radius:4px;background:#f1f5f9;font-size:11.5px;">${row.dataset.department || '—'}</span></td>
					<td style="font-family:'JetBrains Mono', monospace;direction:ltr;text-align:right;">${row.querySelector('.employee-phone').textContent}</td>
					<td style="font-family:'JetBrains Mono', monospace;">${row.dataset.nationalId || '—'}</td>
					<td>${row.dataset.hireDate || '—'}</td>
					<td style="font-weight:700;color:var(--brand-800);">${formatPayrollAmount(row.dataset.salary)} <span class="currency">${currencyLabel}</span></td>
					<td>
						<button type="button" class="edit-employee-button" data-edit-employee="${index}"><i data-lucide="pencil" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-left:3px;"></i>تعديل</button>
						<button type="button" class="delete-employee-button" data-delete-employee="${index}">حذف</button>
					</td>
				`;
				tbody.append(tr);
			});

			let activeDept = 'all';
			const filterDirectory = () => {
				const q = (sectionView.querySelector('#directorySearch')?.value || '').trim().toLocaleLowerCase('ar');
				tbody.querySelectorAll('tr').forEach(r => {
					const matchSearch = !q || r.dataset.search.includes(q);
					const matchDept = activeDept === 'all' || r.dataset.department.includes(activeDept);
					r.hidden = !(matchSearch && matchDept);
				});
			};

			sectionView.querySelector('#directorySearch').addEventListener('input', filterDirectory);
			sectionView.querySelectorAll('[data-dept-filter]').forEach(btn => {
				btn.addEventListener('click', () => {
					sectionView.querySelectorAll('[data-dept-filter]').forEach(b => b.classList.remove('current'));
					btn.classList.add('current');
					activeDept = btn.dataset.deptFilter;
					filterDirectory();
				});
			});
		} else if (view === 'planning') {
			renderWeeklyPlanning();
		} else if (view === 'attendance') {
			const attendanceStatuses = getAttendanceStatuses();
			sectionView.innerHTML = `
				<div class="section-toolbar">
					<div>
						<h1>متابعة الحضور والغيابات</h1>
						<p class="subtitle">تسجيل الحضور اليومي، أوقات العمل، وإدارة حالات الغياب والتأخر.</p>
					</div>
					<div style="display:flex;gap:10px;">
						<button class="secondary-button" id="markAllPresentBtn"><i data-lucide="check-check"></i><span>تسجيل حضور الجميع</span></button>
						<button class="primary-button" data-action="mark-attendance"><i data-lucide="save"></i><span>حفظ سجل اليوم</span></button>
					</div>
				</div>
				<div class="summary-grid">
					<article class="summary-card" data-attendance-category="paid" style="cursor:pointer;"><div class="summary-top"><span>مريض</span><span class="summary-icon"><i data-lucide="heart-pulse"></i></span></div><div class="summary-value" id="attendanceSick">${attendanceStatuses.filter(s => s === 'paid').length}</div><div class="summary-note">شهادات طبية</div></article>
					<article class="summary-card" data-attendance-category="review" style="cursor:pointer;"><div class="summary-top"><span>غائب</span><span class="summary-icon"><i data-lucide="user-x"></i></span></div><div class="summary-value" id="attendanceAbsent">${attendanceStatuses.filter(s => s === 'review').length}</div><div class="summary-note">بدون تبرير</div></article>
					<article class="summary-card" data-attendance-category="pending" style="cursor:pointer;"><div class="summary-top"><span>متأخر</span><span class="summary-icon"><i data-lucide="clock-3"></i></span></div><div class="summary-value" id="attendanceLate">${attendanceStatuses.filter(s => s === 'pending').length}</div><div class="summary-note">تأخر في الدخول</div></article>
					<article class="summary-card card-green"><div class="summary-top"><span>حاضر ومسجل</span><span class="summary-icon"><i data-lucide="user-check"></i></span></div><div class="summary-value" id="attendancePresent">${attendanceStatuses.filter(s => s === 'none').length}</div><div class="summary-note">نشط اليوم</div></article>
				</div>
				<div id="attendanceResultPanel"></div>
				<div class="section-panel">
					<div class="section-panel-head">
						<h2>سجل حضور الموظفين</h2>
						<div style="display:flex;align-items:center;gap:10px;">
							<label style="font-size:12.5px;color:var(--muted);font-weight:500;">تاريخ السجل:</label>
							<input id="attendanceDate" type="date" value="${selectedAttendanceDate}" style="padding:6px 10px;border:1px solid var(--line);border-radius:6px;font-weight:600;">
						</div>
					</div>
					<div class="section-table-wrap">
						<table class="section-table">
							<thead>
								<tr>
									<th>الموظف</th>
									<th>المنصب</th>
									<th>وقت الدخول</th>
									<th>وقت الخروج</th>
									<th>ساعات العمل</th>
									<th>حالة اليوم</th>
								</tr>
							</thead>
							<tbody id="attendanceRows"></tbody>
						</table>
					</div>
				</div>`;
			const tbody = sectionView.querySelector('#attendanceRows');
			[...employeeRows.rows].forEach((empRow, index) => {
				const tr = document.createElement('tr');
				const details = getAttendanceDetails(empRow, index);
				const status = attendanceStatuses[index] || 'none';
				tr.innerHTML = `
					<td>
						<div class="employee">
							<div class="employee-avatar">${empRow.querySelector('.employee-avatar').textContent}</div>
							<div class="employee-name">${empRow.querySelector('.employee-name').textContent}</div>
						</div>
					</td>
					<td><input class="attendance-input" data-emp="${index}" data-field="position" value="${details.position || empRow.dataset.department}"></td>
					<td><input type="time" class="attendance-input" data-emp="${index}" data-field="timeIn" value="${details.timeIn}"></td>
					<td><input type="time" class="attendance-input" data-emp="${index}" data-field="timeOut" value="${details.timeOut}"></td>
					<td id="hours-${index}" style="font-weight:600;font-variant-numeric:tabular-nums;">${formatWorkedHours(details.timeIn, details.timeOut)}</td>
					<td>
						<select class="attendance-select" data-emp="${index}">
							<option value="none" ${status === 'none' ? 'selected' : ''}>🟢 حاضر</option>
							<option value="paid" ${status === 'paid' ? 'selected' : ''}>🟠 مريض</option>
							<option value="review" ${status === 'review' ? 'selected' : ''}>🔴 غائب</option>
							<option value="pending" ${status === 'pending' ? 'selected' : ''}>🟡 متأخر</option>
						</select>
					</td>
				`;
				tbody.append(tr);
			});

			tbody.querySelectorAll('.attendance-input').forEach(inp => inp.addEventListener('change', e => {
				const emp = Number(e.target.dataset.emp);
				const field = e.target.dataset.field;
				if (!attendanceDetailsOverrides[emp]) attendanceDetailsOverrides[emp] = {};
				attendanceDetailsOverrides[emp][field] = e.target.value;
				const h = sectionView.querySelector(`#hours-${emp}`);
				if (h) h.textContent = formatWorkedHours(attendanceDetailsOverrides[emp].timeIn, attendanceDetailsOverrides[emp].timeOut);
			}));
			tbody.querySelectorAll('.attendance-select').forEach(sel => sel.addEventListener('change', e => {
				const emp = Number(e.target.dataset.emp);
				attendanceStatusOverrides[emp] = e.target.value;
				updateAttendanceCounts();
			}));

			sectionView.querySelector('#markAllPresentBtn')?.addEventListener('click', () => {
				sectionView.querySelectorAll('.attendance-select').forEach((sel, i) => {
					sel.value = 'none';
					attendanceStatusOverrides[i] = 'none';
				});
				updateAttendanceCounts();
				showToast('تم تسجيل جميع الموظفين كـ "حاضر"');
			});
		} else if (view === 'leaves') {
			const employeeOptions = [...employeeRows.rows].map(row => `<option value="${row.querySelector('.employee-name').textContent}">${row.querySelector('.employee-name').textContent}</option>`).join('');
			sectionView.innerHTML = `
				<div class="section-toolbar"><div><h1>الإجازات</h1><p class="subtitle">مراجعة طلبات الإجازة واتخاذ الإجراء المناسب.</p></div></div>
				<div class="section-panel" style="margin-bottom:16px">
					<div class="section-panel-head"><h2>إضافة طلب إجازة</h2></div>
					<form id="leaveRequestForm" class="employee-form">
						<div class="form-grid">
							<label class="form-field">الموظف<select name="employee" required>${employeeOptions}</select></label>
							<label class="form-field">نوع الإجازة<select name="type" required><option value="سنوية">سنوية</option><option value="استثنائية">استثنائية</option><option value="مرضية">مرضية</option><option value="أخرى">أخرى</option></select></label>
						</div>
						<div class="form-grid">
							<label class="form-field">من<input name="fromDate" type="date" required></label>
							<label class="form-field">إلى<input name="toDate" type="date" required></label>
						</div>
						<div class="form-actions"><button type="submit" class="primary-button">إضافة الطلب</button></div>
					</form>
				</div>
				<div class="section-panel"><div class="section-panel-head"><h2>طلبات الإجازة</h2></div><div class="section-table-wrap"><table class="section-table"><thead><tr><th>الموظف</th><th>نوع الإجازة</th><th>من</th><th>إلى</th><th>المدة</th><th>الحالة والإجراء</th></tr></thead><tbody id="leaveRequestsTableBody"></tbody></table></div></div>
			`;
			renderLeaveRows();
		} else if (view === 'holidays') {
			renderHolidaysView();
		} else if (view === 'attendance-records') {
			renderAttendanceRecords();
		} else if (view === 'reports') {
			sectionView.innerHTML = `
				<div class="section-toolbar"><div><h1>التقارير والإحصائيات</h1><p class="subtitle">ملخصات شاملة ورسوم بيانية حول الرواتب والغيابات.</p></div></div>
				<div class="summary-grid">
					<article class="summary-card" style="background:#e3f2fd;"><div class="summary-top"><span>إجمالي الرواتب</span><span class="summary-icon"><i data-lucide="wallet"></i></span></div><div class="summary-value">${formatPayrollAmount(getTotalMonthlySalary())} <span class="currency">${currencyLabel}</span></div></article>
					<article class="summary-card" style="background:#e8f5e9;"><div class="summary-top"><span>صافي المستحقات</span><span class="summary-icon"><i data-lucide="banknote"></i></span></div><div class="summary-value">${formatPayrollAmount(getTotalNetSalary())} <span class="currency">${currencyLabel}</span></div></article>
					<article class="summary-card" style="background:#fff3e0;"><div class="summary-top"><span>الموظفون</span><span class="summary-icon"><i data-lucide="users-round"></i></span></div><div class="summary-value">${employeeRows.rows.length}</div></article>
					<article class="summary-card" style="background:#f3e5f5;"><div class="summary-top"><span>فترة التقرير</span><span class="summary-icon"><i data-lucide="calendar-days"></i></span></div><div class="summary-value" style="font-size:16px">${selectedMonth}</div></article>
				</div>
				<div class="section-panel" style="padding:16px;">
					<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;">
						<div style="height:280px;"><h3 style="margin-top:0;">توزيع الرواتب</h3><canvas id="salaryChart"></canvas></div>
						<div style="height:280px;"><h3 style="margin-top:0;">إحصائيات الحضور</h3><canvas id="attendanceChart"></canvas></div>
					</div>
				</div>
			`;
			setTimeout(() => renderReportCharts(), 100);
		} else if (view === 'monthly') {
			sectionView.innerHTML = `
				<div class="section-toolbar"><div><h1>التقرير الشهري</h1><p class="subtitle">تقرير مفصل لرواتب شهر ${formatMonthLabel(selectedMonth)}.</p></div><button class="secondary-button" data-action="export-payroll"><i data-lucide="download"></i><span>تصدير PDF</span></button></div>
				<div class="section-panel">
					<div class="section-table-wrap">
						<table class="section-table payroll-table">
							<thead><tr><th>الموظف</th><th>الراتب الشهري</th><th>التسبيق</th><th>الراتب اليومي</th><th>الغياب</th><th>أيام العمل</th><th>الصافي</th></tr></thead>
							<tbody>${[...employeeRows.rows].map(row => `<tr><td>${row.querySelector('.employee-name').textContent}</td><td>${formatPayrollAmount(row.dataset.salary)} ${currencyLabel}</td><td>${formatPayrollAmount(row.dataset.advance)} ${currencyLabel}</td><td>${row.querySelector('[data-result="daily"]').textContent}</td><td>${row.dataset.absenceDays}</td><td>${row.dataset.workDays}</td><td><strong>${row.querySelector('[data-result="net"]').textContent} ${currencyLabel}</strong></td></tr>`).join('')}</tbody>
						</table>
					</div>
				</div>
			`;
		}
		sectionView.dataset.view = view;
		if (window.lucide) lucide.createIcons({ nodes: [sectionView] });
	}

	navItems.forEach(item => item.addEventListener('click', () => renderView(item.dataset.view)));

	document.addEventListener('click', e => {
		const openView = e.target.closest('[data-open-view]');
		if (openView) { renderView(openView.dataset.openView); return; }
		const actionBtn = e.target.closest('[data-action]');
		if (actionBtn) {
			const action = actionBtn.dataset.action;
			if (action === 'add-employee') document.getElementById('addButton').click();
			if (action === 'export-payroll' || action === 'export-weekly-planning') {
				const lines = [
					{ text: `كشف الرواتب - شهر ${formatMonthLabel(selectedMonth)}`, heading: true },
					{ cells: ['اسم الموظف', 'الراتب الشهري', 'التسبيق', 'أيام الغياب', 'الراتب الصافي'], heading: true },
					...[...employeeRows.rows].map(r => ({
						cells: [
							r.querySelector('.employee-name').textContent,
							`${formatPayrollAmount(r.dataset.salary)} ${currencyLabel}`,
							`${formatPayrollAmount(r.dataset.advance)} ${currencyLabel}`,
							r.dataset.absenceDays || '0',
							`${r.querySelector('[data-result="net"]').textContent} ${currencyLabel}`
						]
					}))
				];
				downloadPdfReport('مسير الرواتب', lines, `مسير-الرواتب-${selectedMonth}`);
			}
			if (action === 'save-weekly-planning') {
				persistLocalDatabase();
				showToast('✓ تم حفظ التخطيط الأسبوعي بنجاح');
			}
			if (action === 'mark-attendance') {
				const date = sectionView.querySelector('#attendanceDate')?.value || getLocalDateValue();
				attendanceHistory[date] = getAttendanceRecord(date);
				persistLocalDatabase();
				showToast('✓ تم حفظ سجل حضور اليوم بنجاح');
			}
		}
		const editBtn = e.target.closest('[data-edit-employee]');
		if (editBtn) {
			activeEmployeeRow = employeeRows.rows[Number(editBtn.dataset.editEmployee)];
			if (!activeEmployeeRow) return;
			const form = document.getElementById('employeeEditForm');
			form.elements.name.value = activeEmployeeRow.querySelector('.employee-name').textContent;
			form.elements.phone.value = activeEmployeeRow.querySelector('.employee-phone').textContent;
			form.elements.nationalId.value = activeEmployeeRow.dataset.nationalId || '';
			form.elements.hireDate.value = activeEmployeeRow.dataset.hireDate || getLocalDateValue();
			form.elements.department.value = activeEmployeeRow.dataset.department || '';
			form.elements.salary.value = activeEmployeeRow.dataset.salary || 0;
			document.getElementById('employeeEditDialog').showModal();
		}
		const delBtn = e.target.closest('[data-delete-employee]');
		if (delBtn) {
			const idx = Number(delBtn.dataset.deleteEmployee);
			const row = employeeRows.rows[idx];
			if (row && confirm(`هل تريد حذف الموظف "${row.querySelector('.employee-name').textContent}"؟`)) {
				row.remove();
				persistLocalDatabase();
				filterRows();
				renderView('employees');
				showToast('تم حذف الموظف');
			}
		}
	});

	document.getElementById('employeeEditForm').addEventListener('submit', e => {
		e.preventDefault();
		if (!activeEmployeeRow) return;
		const f = new FormData(e.currentTarget);
		activeEmployeeRow.querySelector('.employee-name').textContent = f.get('name');
		activeEmployeeRow.querySelector('.employee-phone').textContent = f.get('phone');
		activeEmployeeRow.dataset.nationalId = f.get('nationalId') || '';
		activeEmployeeRow.dataset.hireDate = f.get('hireDate') || '';
		activeEmployeeRow.dataset.department = f.get('department') || '';
		activeEmployeeRow.dataset.salary = f.get('salary') || 0;
		calculatePayrollRow(activeEmployeeRow);
		persistLocalDatabase();
		document.getElementById('employeeEditDialog').close();
		filterRows();
		renderView('employees');
		showToast('تم تعديل بيانات الموظف بنجاح');
	});

	document.getElementById('saveButton').addEventListener('click', () => {
		const btn = document.getElementById('saveButton');
		const badgeText = document.getElementById('cloudStatusText');
		btn.innerHTML = '<i data-lucide="check"></i><span>جاري المزامنة...</span>';
		if (badgeText) badgeText.textContent = 'جاري المزامنة...';
		if (window.lucide) lucide.createIcons();

		const success = persistLocalDatabase();
		setTimeout(() => {
			if (success) {
				btn.innerHTML = '<i data-lucide="check-circle-2"></i><span>تم الحفظ والمزامنة</span>';
				if (badgeText) badgeText.textContent = 'متصل بالسحابة (محدث)';
				showToast('✓ تم حفظ ومزامنة كافة البيانات السحابية بنجاح');
				setTimeout(() => {
					btn.innerHTML = '<i data-lucide="cloud-upload"></i><span>حفظ ومزامنة</span>';
					if (window.lucide) lucide.createIcons();
				}, 2200);
			} else {
				btn.innerHTML = '<i data-lucide="alert-circle"></i><span>فشل الحفظ</span>';
				showToast('تعذر الحفظ، يرجى المحاولة لاحقاً', true);
			}
			if (window.lucide) lucide.createIcons();
		}, 300);
	});

	document.getElementById('addButton').addEventListener('click', () => {
		document.querySelector('#employeeForm [name="hireDate"]').value = getLocalDateValue();
		dialog.showModal();
	});
	document.getElementById('closeDialog').addEventListener('click', () => dialog.close());
	document.getElementById('cancelDialog').addEventListener('click', () => dialog.close());

	document.getElementById('employeeForm').addEventListener('submit', e => {
		e.preventDefault();
		const form = new FormData(e.currentTarget);
		const name = form.get('name').trim();
		const phone = form.get('phone').trim();
		const nationalId = form.get('nationalId').trim();
		const hireDate = form.get('hireDate');
		const department = form.get('department');
		const salary = Number(form.get('salary')) || 0;
		const advance = Number(form.get('advance')) || 0;
		const row = createPayrollRow({ name, phone, nationalId, hireDate, department, salary, advance, absenceDays: 0, misAPiedDays: 0, extraDays: 0, restDays: 0, sickDays: 0 });
		employeeRows.prepend(row);
		persistLocalDatabase();
		e.currentTarget.reset();
		dialog.close();
		filterRows();
		showToast('تمت إضافة الموظف بنجاح');
	});

	document.querySelectorAll('[data-close-dialog]').forEach(btn => {
		btn.addEventListener('click', () => document.getElementById(btn.dataset.closeDialog)?.close());
	});

	document.getElementById('notificationsButton').addEventListener('click', () => {
		document.getElementById('notificationsSummary').textContent = `${employeeRows.rows.length} موظف مسجل | ${getPendingLeaveCount()} طلب إجازة قيد المراجعة`;
		document.getElementById('alertsList').innerHTML = `
			<div style="padding:8px;background:#eef9f5;border-right:4px solid #2d6d46;border-radius:4px;margin-bottom:6px;">نظام الرواتب يعمل بكفاءة</div>
			${getPendingLeaveCount() > 0 ? `<div style="padding:8px;background:#fff4df;border-right:4px solid #a66418;border-radius:4px;">يوجد ${getPendingLeaveCount()} طلبات إجازة جديدة بحاجة للمراجعة</div>` : ''}
		`;
		document.getElementById('notificationsDialog').showModal();
	});

	document.getElementById('settingsButton').addEventListener('click', () => {
		document.getElementById('settingsDialog').showModal();
	});

	searchInput.addEventListener('input', () => { currentPage = 1; filterRows(); });
	document.getElementById('previousPage').addEventListener('click', () => { if (currentPage > 1) { currentPage--; filterRows(); } });
	document.getElementById('nextPage').addEventListener('click', () => { currentPage++; filterRows(); });
	document.getElementById('monthSelect').addEventListener('change', e => {
		selectedMonth = e.target.value;
		filterRows();
	});

	employeeRows.addEventListener('input', e => {
		if (e.target.matches('.payroll-input')) {
			calculatePayrollRow(e.target.closest('tr'));
			persistLocalDatabase();
		}
	});

	async function initializeCloud() {
		if (!window.ObayoliCloud || typeof window.ObayoliCloud.getState !== 'function') {
			return;
		}
		try {
			currentUser = await window.ObayoliCloud.getCurrentUser();
			const remote = await window.ObayoliCloud.getState('hr');
			if (remote && remote.payload) {
				restoreLocalDatabase(remote.payload);
				remoteRevision = remote.revision || 1;
				cloudReady = true;
				filterRows();
				showToast('تم الاتصال بقاعدة البيانات السحابية ومزامنة البيانات');
			} else {
				cloudReady = true;
				// First time: sync current data to cloud
				persistLocalDatabase();
				showToast('تم إنشاء قاعدة البيانات السحابية وحفظ البيانات بنجاح');
			}
		} catch (error) {
			console.error('Cloud init error:', error);
		}
	}

	// Initialize
	updateMonthOptions();
	restoreLocalDatabase();
	filterRows();
	renderView('home');
	initializeCloud();
})();
