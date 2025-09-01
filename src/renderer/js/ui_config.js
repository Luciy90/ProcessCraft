// Глобальный конфиг UI: тексты, иконки, версии
(function() {
	window.UI_CONFIG = {
		app: {
			name: 'ProcessCraft',
			tagline: 'Управление производством',
			version: 'v0.0.1',
			logoText: 'ОЗО'
		},
		icons: {
			nav: {
				dashboard: 'layout-dashboard',
				orders: 'clipboard-list',
				design: 'layers',
				technology: 'flask-conical',
				warehouse: 'package',
				molds: 'cube',
				maintenance: 'wrench',
				production: 'building-2',
				analytics: 'line-chart'
			},
			actions: {
				notifications: 'bell',
				settings: 'settings',
				search: 'search',
				period: 'calendar-clock',
				upload: 'upload',
				imageUp: 'image-up',
				alertTriangle: 'alert-triangle',
				copy: 'copy'
			}
		},
		texts: {
			modules: {
				dashboard: 'Панель управления',
				orders: 'Управление заказами',
				design: 'Конструкторский отдел',
				technology: 'Технологи',
				warehouse: 'Склад',
				molds: 'Производство форм',
				maintenance: 'РММ',
				production: 'Производственный цех',
				analytics: 'Аналитика'
			},
			topbar: {
				title_default: 'Панель управления',
				period: 'Период',
				search_placeholder: 'Поиск: заказы, КД, материалы…',
				notifications_label: 'Уведомления'
			},
			buttons: {
				save: 'Сохранить',
				cancel: 'Отмена',
				new_order: 'Новый заказ',
				settings: 'Настройки'
			},
			settings: {
				title: 'Настройки',
				version_label: 'Версия',
				notifications: 'Уведомления',
				autosave: 'Автосохранение',
				db_path: 'Путь к базе данных'
			},
			notifications: {
				empty: 'Нет новых уведомлений',
				types: {
					info: 'Информация',
					success: 'Успешно',
					error: 'Ошибка'
				}
			},
			time: {
				just_now: 'Только что',
				minutes_ago_suffix: ' мин назад',
				hours_ago_suffix: ' ч назад'
			},
			orders: {
				filters: {
					status_label: 'Статус',
					customer_label: 'Клиент',
					search_placeholder: 'Поиск по номеру заказа…'
				},
				columns: {
					order_no: '№ Заказа',
					customer: 'Клиент',
					product: 'Продукт',
					qty: 'Количество',
					status: 'Статус',
					created_at: 'Дата создания',
					deadline: 'Срок выполнения',
					actions: 'Действия'
				},
				statuses: {
					new: 'Новый',
					confirmed: 'Подтвержден',
					in_production: 'В производстве',
					ready: 'Готов',
					shipped: 'Отгружен',
					cancelled: 'Отменен'
				},
				no_data: 'Нет заказов'
			},
			profile: {
				header: {
					cover: {
						change_background_button: 'Изменить фон'
					}
				},
				userInfo: {
					title: 'Информация о пользователе',
					description: 'Контактные данные и реквизиты',
					copy_email_button: 'e‑mail',
					fields: {
						email_label: 'Электронная почта',
						phone_label: 'Телефон',
						position_label: 'Должность',
						department_label: 'Отдел',
						placeholder: '—'
					}
				}
			}
		},
		nav: [
			{ key: 'dashboard', title: 'Панель управления', subtitle: 'Сводка и KPI' },
			{ key: 'orders', title: 'Управление заказами', subtitle: 'Клиенты, этапы, история' },
			{ key: 'design', title: 'Конструкторский модуль', subtitle: 'Версии КД, 3D, упаковка' },
			{ key: 'technology', title: 'Модуль технологов', subtitle: 'Материалы, ТУ, параметры' },
			{ key: 'warehouse', title: 'Складской модуль', subtitle: 'Остатки, накладные' },
			{ key: 'molds', title: 'Производство форм', subtitle: '3D, фрезер., токарка' },
			{ key: 'maintenance', title: 'РММ / Главный инженер', subtitle: 'Задачи, ремонты' },
			{ key: 'production', title: 'Производственный цех', subtitle: 'Карты, график' },
			{ key: 'analytics', title: 'Аналитика и отчёты', subtitle: 'KPI, себестоимость' }
		],
		dashboard: {
			cards: [
				{ key: 'active-orders-count', title: 'Активные заказы', ring: 'indigo' },
				{ key: 'in-production-count', title: 'В производстве', ring: 'rose' },
				{ key: 'ready-to-ship-count', title: 'Готово к отгрузке', ring: 'sky' },
				{ key: 'critical-tasks-count', title: 'Критические задачи', ring: 'amber' }
			]
		}
	};
})();
