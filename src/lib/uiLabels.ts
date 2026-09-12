export type UiLabels = {
  searchCities: string; searchingCities: string; citySearchUnavailable: string; noMatchingCities: string;
  signOut: string; openSignOut: string; signOutGoogleTitle: string; signOutGoogleCalendarTitle: string;
  signOutGoogleMessage: string; signOutCalendarMessage: string; cancel: string; logout: string;
  weatherAlert: string; effective: string; pagasaDailyNoOnset: string; nowInEffect: string; source: string;
  calendarOffline: string; calendarRemembered: string; connecting: string; renewGoogleAccess: string; connectGoogleCalendar: string;
  holidaysReminders: string; closeHolidaysReminders: string; holiday: string; reminder: string; allDay: string; todayUpper: string;
  calendarEvent: string; journalMarker: string;
  personalWeatherJournal: string; viewingJournalFor: string; savedRecord: string; savedRecords: string;
  connectGoogleToRecord: string; recordObservation: string; viewOnlyPlaceholder: string; addPhotos: string;
  selectedJournalPhoto: string; removeSelectedPhoto: string; saveChanges: string; saveJournalEntry: string;
  viewOnlyToday: string; cancelEdit: string; signedOutJournalInfo: string; edit: string; delete: string;
  editJournalEntry: string; deleteJournalEntry: string; restoreJournalSize: string; expandJournal: string; restoreSize: string;
  weatherJournalPhoto: string; backedUpGooglePhotos: string; savingGooglePhotos: string; retryGooglePhotos: string;
  deleteJournalTitle: string; deleteJournalMessage: string; fullSizeJournalPhoto: string; closePhotoPreview: string;
  journalOnlyToday: string; journalOldDatesViewOnly: string; journalSaved: string; selectDateToView: string; savedOnDevice: string;
  journalReconnectDrive: string; journalReadError: string; journalSaveError: string; photosSaved: string; photosNeedBackup: string;
  localPhotosKept: string; cloudSyncFailed: string; journalCloudPaused: string; savingJournalPhotos: string;
  installPending: string; installAccepted: string; installCancelled: string; installError: string; installQuestion: string;
  installHttps: string; installIos: string; installUnavailable: string; notNow: string; close: string; closeInstallMessage: string;
};

const en: UiLabels = {
  searchCities: 'Search cities...', searchingCities: 'Searching cities…', citySearchUnavailable: 'City search unavailable. Please try again.', noMatchingCities: 'No matching cities found.',
  signOut: 'Sign out', openSignOut: 'Open sign out confirmation', signOutGoogleTitle: 'Sign out of Google?', signOutGoogleCalendarTitle: 'Sign out of Google Calendar?',
  signOutGoogleMessage: 'Your journal stays saved. Sign in with this Google account again to resume Drive sync across devices.', signOutCalendarMessage: 'Your local journal records and photos will remain saved. Calendar updates and cloud journal sync will pause until you reconnect.', cancel: 'Cancel', logout: 'Logout',
  weatherAlert: 'WEATHER ALERT', effective: 'Effective', pagasaDailyNoOnset: 'PAGASA daily outlook; no onset time published', nowInEffect: 'now / already in effect', source: 'Source',
  calendarOffline: 'Offline: your account and journal are still available. Google Calendar updates require internet.', calendarRemembered: 'Your account is remembered. Renew Google access to update Calendar and back up new photos.', connecting: 'Connecting…', renewGoogleAccess: 'Renew Google access', connectGoogleCalendar: 'Connect Google Calendar',
  holidaysReminders: 'Holidays & Reminders', closeHolidaysReminders: 'Close holidays and reminders', holiday: 'Holiday', reminder: 'Reminder', allDay: 'All day', todayUpper: 'TODAY', calendarEvent: 'Calendar event', journalMarker: 'Journal',
  personalWeatherJournal: 'Personal weather journal', viewingJournalFor: 'Viewing journal for', savedRecord: 'saved record', savedRecords: 'saved records', connectGoogleToRecord: 'Connect your Google account to record a journal entry', recordObservation: 'Record rain, flooding, temperature, visibility, or other observations…', viewOnlyPlaceholder: 'Previous and future dates are view-only. Journal entries can be recorded only for today.', addPhotos: 'Add photos', selectedJournalPhoto: 'Selected journal photo', removeSelectedPhoto: 'Remove selected photo', saveChanges: 'Save changes', saveJournalEntry: 'Save journal entry', viewOnlyToday: 'View only — journal recording is available only for today', cancelEdit: 'Cancel edit', signedOutJournalInfo: 'Signing out does not delete saved journal records. Connect your Google account to view and sync them again.', edit: 'Edit', delete: 'Delete', editJournalEntry: 'Edit journal entry', deleteJournalEntry: 'Delete journal entry', restoreJournalSize: 'Restore journal size', expandJournal: 'Expand journal', restoreSize: 'Restore size', weatherJournalPhoto: 'Weather journal photo', backedUpGooglePhotos: 'Backed up to Google Photos', savingGooglePhotos: 'Saving to Google Photos…', retryGooglePhotos: 'Retry Google Photos backup', deleteJournalTitle: 'Delete this journal entry?', deleteJournalMessage: 'This will remove the entry from this device and sync the deletion to your Google Drive journal on your other devices.', fullSizeJournalPhoto: 'Full-size journal photo', closePhotoPreview: 'Close photo preview', journalOnlyToday: 'Journal recording is available only for today. Previous and future dates are view-only.', journalOldDatesViewOnly: "Previous and future journal dates are view-only. Only today's journal can be edited.", journalSaved: 'Journal entry saved for', selectDateToView: 'Select that date in the calendar to view it.', savedOnDevice: 'Saved on this device.', journalReconnectDrive: 'Google account is remembered, but cloud journal sync is paused. Reconnect your Google account to renew Drive access and sync this device.', journalReadError: 'Saved journal records could not be read. Existing data has not been overwritten.', journalSaveError: 'Journal changes were not saved. Device storage may be full or unavailable. Existing records and your draft have been kept; try fewer or smaller photos.', photosSaved: 'Photos saved to Google Photos. Local journal and photos are also kept.', photosNeedBackup: 'Some photos still need backup. Use Retry Google Photos backup.', localPhotosKept: 'Local journal and photos are kept.', cloudSyncFailed: 'Cloud journal sync failed.', journalCloudPaused: 'Renew Google access before backing up these photos.', savingJournalPhotos: 'Saving journal photos to Google Photos…',
  installPending: 'Confirm or cancel in your browser’s install prompt.', installAccepted: 'Installation requested. Your browser will finish installing WeatherNow.', installCancelled: 'Installation cancelled. You can keep using this dashboard.', installError: 'The browser could not open installation. Try its Install App or Add to Home Screen menu.', installQuestion: 'Install WeatherNow on this device?', installHttps: 'Installation requires HTTPS. Open your secure WeatherNow address to install.', installIos: 'Use your browser’s Share menu, then Add to Home Screen. You can keep using this dashboard without installing.', installUnavailable: 'Your browser has not offered installation. Use its Install App or Add to Home Screen menu if available, or continue in this dashboard.', notNow: 'Not now', close: 'Close', closeInstallMessage: 'Close install message',
};

const overrides: Record<string, Partial<UiLabels>> = {
  es: { searchCities:'Buscar ciudades...', searchingCities:'Buscando ciudades…', citySearchUnavailable:'La búsqueda de ciudades no está disponible. Inténtalo de nuevo.', noMatchingCities:'No se encontraron ciudades coincidentes.', signOut:'Cerrar sesión', openSignOut:'Abrir confirmación de cierre de sesión', signOutGoogleTitle:'¿Cerrar sesión de Google?', signOutGoogleCalendarTitle:'¿Cerrar sesión de Google Calendar?', signOutGoogleMessage:'Tu diario permanece guardado. Inicia sesión de nuevo con esta cuenta de Google para reanudar la sincronización de Drive entre dispositivos.', signOutCalendarMessage:'Tus registros y fotos locales del diario permanecerán guardados. Las actualizaciones del calendario y la sincronización del diario en la nube se pausarán hasta que vuelvas a conectarte.', cancel:'Cancelar', logout:'Cerrar sesión', weatherAlert:'ALERTA METEOROLÓGICA', effective:'Vigente', pagasaDailyNoOnset:'pronóstico diario de PAGASA; no se publicó hora de inicio', nowInEffect:'ahora / ya vigente', source:'Fuente', calendarOffline:'Sin conexión: tu cuenta y diario siguen disponibles. Las actualizaciones de Google Calendar requieren internet.', calendarRemembered:'Tu cuenta está recordada. Renueva el acceso de Google para actualizar el calendario y respaldar nuevas fotos.', connecting:'Conectando…', renewGoogleAccess:'Renovar acceso de Google', connectGoogleCalendar:'Conectar Google Calendar', holidaysReminders:'Festivos y recordatorios', closeHolidaysReminders:'Cerrar festivos y recordatorios', holiday:'Festivo', reminder:'Recordatorio', allDay:'Todo el día', todayUpper:'HOY', calendarEvent:'Evento del calendario', journalMarker:'Diario', personalWeatherJournal:'Diario meteorológico personal', viewingJournalFor:'Viendo el diario de', savedRecord:'registro guardado', savedRecords:'registros guardados', connectGoogleToRecord:'Conecta tu cuenta de Google para registrar una entrada', recordObservation:'Registra lluvia, inundaciones, temperatura, visibilidad u otras observaciones…', viewOnlyPlaceholder:'Las fechas pasadas y futuras son solo de lectura. Solo se puede registrar el diario de hoy.', addPhotos:'Añadir fotos', selectedJournalPhoto:'Foto seleccionada del diario', removeSelectedPhoto:'Quitar foto seleccionada', saveChanges:'Guardar cambios', saveJournalEntry:'Guardar entrada del diario', viewOnlyToday:'Solo lectura — el registro del diario solo está disponible para hoy', cancelEdit:'Cancelar edición', signedOutJournalInfo:'Cerrar sesión no elimina los registros guardados. Conecta tu cuenta de Google para verlos y sincronizarlos de nuevo.', edit:'Editar', delete:'Eliminar', editJournalEntry:'Editar entrada del diario', deleteJournalEntry:'Eliminar entrada del diario', restoreJournalSize:'Restaurar tamaño del diario', expandJournal:'Expandir diario', restoreSize:'Restaurar tamaño', weatherJournalPhoto:'Foto del diario meteorológico', backedUpGooglePhotos:'Respaldado en Google Photos', savingGooglePhotos:'Guardando en Google Photos…', retryGooglePhotos:'Reintentar respaldo en Google Photos', deleteJournalTitle:'¿Eliminar esta entrada del diario?', deleteJournalMessage:'Esto eliminará la entrada de este dispositivo y sincronizará la eliminación con tu diario de Google Drive en tus otros dispositivos.', fullSizeJournalPhoto:'Foto del diario a tamaño completo', closePhotoPreview:'Cerrar vista previa de foto', journalOnlyToday:'El registro del diario solo está disponible para hoy. Las fechas pasadas y futuras son solo de lectura.', journalOldDatesViewOnly:'Las fechas pasadas y futuras son solo de lectura. Solo se puede editar el diario de hoy.', journalSaved:'Entrada del diario guardada para', selectDateToView:'Selecciona esa fecha en el calendario para verla.', savedOnDevice:'Guardado en este dispositivo.', journalReconnectDrive:'La cuenta de Google está recordada, pero la sincronización del diario está pausada. Vuelve a conectar Google para renovar el acceso a Drive.', journalReadError:'No se pudieron leer los registros guardados. Los datos existentes no se han sobrescrito.', journalSaveError:'No se guardaron los cambios del diario. El almacenamiento del dispositivo puede estar lleno o no disponible.', photosSaved:'Fotos guardadas en Google Photos. El diario y las fotos locales también se conservan.', photosNeedBackup:'Algunas fotos aún necesitan respaldo. Usa Reintentar respaldo en Google Photos.', localPhotosKept:'El diario y las fotos locales se conservan.', cloudSyncFailed:'Falló la sincronización del diario en la nube.', journalCloudPaused:'Renueva el acceso de Google antes de respaldar estas fotos.', savingJournalPhotos:'Guardando fotos del diario en Google Photos…', installPending:'Confirma o cancela en el aviso de instalación de tu navegador.', installAccepted:'Instalación solicitada. Tu navegador terminará de instalar WeatherNow.', installCancelled:'Instalación cancelada. Puedes seguir usando este panel.', installError:'El navegador no pudo abrir la instalación. Usa Instalar aplicación o Añadir a pantalla de inicio.', installQuestion:'¿Instalar WeatherNow en este dispositivo?', installHttps:'La instalación requiere HTTPS. Abre la dirección segura de WeatherNow.', installIos:'Usa el menú Compartir del navegador y luego Añadir a pantalla de inicio.', installUnavailable:'Tu navegador aún no ha ofrecido la instalación. Usa su menú de instalación si está disponible.', notNow:'Ahora no', close:'Cerrar', closeInstallMessage:'Cerrar mensaje de instalación' },
  fr: { searchCities:'Rechercher des villes...', searchingCities:'Recherche de villes…', citySearchUnavailable:'Recherche de villes indisponible. Réessayez.', noMatchingCities:'Aucune ville correspondante.', signOut:'Se déconnecter', openSignOut:'Ouvrir la confirmation de déconnexion', signOutGoogleTitle:'Se déconnecter de Google ?', signOutGoogleCalendarTitle:'Se déconnecter de Google Calendar ?', signOutGoogleMessage:'Votre journal reste enregistré. Reconnectez-vous avec ce compte Google pour reprendre la synchronisation Drive entre appareils.', signOutCalendarMessage:'Vos entrées et photos locales restent enregistrées. Les mises à jour du calendrier et la synchronisation du journal seront suspendues jusqu’à la reconnexion.', cancel:'Annuler', logout:'Déconnexion', weatherAlert:'ALERTE MÉTÉO', effective:'En vigueur', pagasaDailyNoOnset:'prévision quotidienne PAGASA ; heure de début non publiée', nowInEffect:'maintenant / déjà en vigueur', source:'Source', calendarOffline:'Hors ligne : votre compte et votre journal restent disponibles. Les mises à jour Google Calendar nécessitent Internet.', calendarRemembered:'Votre compte est mémorisé. Renouvelez l’accès Google pour mettre à jour le calendrier et sauvegarder les nouvelles photos.', connecting:'Connexion…', renewGoogleAccess:'Renouveler l’accès Google', connectGoogleCalendar:'Connecter Google Calendar', holidaysReminders:'Jours fériés et rappels', closeHolidaysReminders:'Fermer les jours fériés et rappels', holiday:'Jour férié', reminder:'Rappel', allDay:'Toute la journée', todayUpper:'AUJOURD’HUI', calendarEvent:'Événement du calendrier', journalMarker:'Journal', personalWeatherJournal:'Journal météo personnel', viewingJournalFor:'Journal affiché pour', savedRecord:'entrée enregistrée', savedRecords:'entrées enregistrées', connectGoogleToRecord:'Connectez votre compte Google pour créer une entrée', recordObservation:'Notez pluie, inondations, température, visibilité ou autres observations…', viewOnlyPlaceholder:'Les dates passées et futures sont en lecture seule. Seul le journal d’aujourd’hui peut être enregistré.', addPhotos:'Ajouter des photos', selectedJournalPhoto:'Photo de journal sélectionnée', removeSelectedPhoto:'Retirer la photo sélectionnée', saveChanges:'Enregistrer les modifications', saveJournalEntry:'Enregistrer l’entrée', viewOnlyToday:'Lecture seule — le journal ne peut être enregistré que pour aujourd’hui', cancelEdit:'Annuler la modification', signedOutJournalInfo:'La déconnexion ne supprime pas les entrées enregistrées. Connectez votre compte Google pour les afficher et les synchroniser.', edit:'Modifier', delete:'Supprimer', editJournalEntry:'Modifier l’entrée', deleteJournalEntry:'Supprimer l’entrée', restoreJournalSize:'Restaurer la taille du journal', expandJournal:'Agrandir le journal', restoreSize:'Restaurer la taille', weatherJournalPhoto:'Photo du journal météo', backedUpGooglePhotos:'Sauvegardé dans Google Photos', savingGooglePhotos:'Enregistrement dans Google Photos…', retryGooglePhotos:'Réessayer la sauvegarde Google Photos', deleteJournalTitle:'Supprimer cette entrée du journal ?', deleteJournalMessage:'Cette action supprimera l’entrée de cet appareil et synchronisera la suppression avec votre journal Google Drive sur vos autres appareils.', fullSizeJournalPhoto:'Photo du journal en taille réelle', closePhotoPreview:'Fermer l’aperçu photo', journalOnlyToday:'Le journal ne peut être enregistré que pour aujourd’hui. Les dates passées et futures sont en lecture seule.', journalOldDatesViewOnly:'Les dates passées et futures sont en lecture seule. Seul le journal d’aujourd’hui peut être modifié.', journalSaved:'Entrée du journal enregistrée pour', selectDateToView:'Sélectionnez cette date dans le calendrier pour l’afficher.', savedOnDevice:'Enregistré sur cet appareil.', journalReconnectDrive:'Le compte Google est mémorisé, mais la synchronisation du journal est en pause. Reconnectez Google pour renouveler l’accès Drive.', journalReadError:'Impossible de lire les entrées enregistrées. Les données existantes n’ont pas été écrasées.', journalSaveError:'Les modifications du journal n’ont pas été enregistrées. Le stockage peut être plein ou indisponible.', photosSaved:'Photos enregistrées dans Google Photos. Le journal et les photos locales sont également conservés.', photosNeedBackup:'Certaines photos doivent encore être sauvegardées. Utilisez Réessayer la sauvegarde Google Photos.', localPhotosKept:'Le journal et les photos locales sont conservés.', cloudSyncFailed:'Échec de la synchronisation du journal.', journalCloudPaused:'Renouvelez l’accès Google avant de sauvegarder ces photos.', savingJournalPhotos:'Enregistrement des photos du journal dans Google Photos…', installPending:'Confirmez ou annulez dans l’invite d’installation du navigateur.', installAccepted:'Installation demandée. Votre navigateur terminera l’installation de WeatherNow.', installCancelled:'Installation annulée. Vous pouvez continuer à utiliser ce tableau de bord.', installError:'Le navigateur n’a pas pu ouvrir l’installation. Utilisez Installer l’application ou Ajouter à l’écran d’accueil.', installQuestion:'Installer WeatherNow sur cet appareil ?', installHttps:'L’installation nécessite HTTPS. Ouvrez l’adresse sécurisée de WeatherNow.', installIos:'Utilisez le menu Partager du navigateur, puis Ajouter à l’écran d’accueil.', installUnavailable:'Votre navigateur n’a pas proposé l’installation. Utilisez son menu d’installation s’il est disponible.', notNow:'Pas maintenant', close:'Fermer', closeInstallMessage:'Fermer le message d’installation' },
  de: { searchCities:'Städte suchen...', searchingCities:'Städte werden gesucht…', citySearchUnavailable:'Städtesuche nicht verfügbar. Bitte erneut versuchen.', noMatchingCities:'Keine passenden Städte gefunden.', signOut:'Abmelden', openSignOut:'Abmeldebestätigung öffnen', signOutGoogleTitle:'Von Google abmelden?', signOutGoogleCalendarTitle:'Von Google Kalender abmelden?', signOutGoogleMessage:'Dein Journal bleibt gespeichert. Melde dich erneut mit diesem Google-Konto an, um die Drive-Synchronisierung fortzusetzen.', signOutCalendarMessage:'Lokale Journaleinträge und Fotos bleiben gespeichert. Kalender-Updates und Cloud-Synchronisierung pausieren bis zur erneuten Verbindung.', cancel:'Abbrechen', logout:'Abmelden', weatherAlert:'WETTERWARNUNG', effective:'Gültig', pagasaDailyNoOnset:'tägliche PAGASA-Prognose; keine Startzeit veröffentlicht', nowInEffect:'jetzt / bereits aktiv', source:'Quelle', calendarOffline:'Offline: Konto und Journal bleiben verfügbar. Google-Kalender-Updates benötigen Internet.', calendarRemembered:'Dein Konto ist gespeichert. Erneuere den Google-Zugriff für Kalender-Updates und neue Foto-Backups.', connecting:'Verbindung…', renewGoogleAccess:'Google-Zugriff erneuern', connectGoogleCalendar:'Google Kalender verbinden', holidaysReminders:'Feiertage & Erinnerungen', closeHolidaysReminders:'Feiertage und Erinnerungen schließen', holiday:'Feiertag', reminder:'Erinnerung', allDay:'Ganztägig', todayUpper:'HEUTE', calendarEvent:'Kalendereintrag', journalMarker:'Journal', personalWeatherJournal:'Persönliches Wetterjournal', viewingJournalFor:'Journal anzeigen für', savedRecord:'gespeicherter Eintrag', savedRecords:'gespeicherte Einträge', connectGoogleToRecord:'Google-Konto verbinden, um einen Journaleintrag zu erstellen', recordObservation:'Regen, Überflutung, Temperatur, Sicht oder andere Beobachtungen notieren…', viewOnlyPlaceholder:'Vergangene und zukünftige Daten sind schreibgeschützt. Einträge sind nur für heute möglich.', addPhotos:'Fotos hinzufügen', selectedJournalPhoto:'Ausgewähltes Journalfoto', removeSelectedPhoto:'Ausgewähltes Foto entfernen', saveChanges:'Änderungen speichern', saveJournalEntry:'Journaleintrag speichern', viewOnlyToday:'Nur Ansicht — Journalaufnahmen sind nur für heute verfügbar', cancelEdit:'Bearbeitung abbrechen', signedOutJournalInfo:'Abmelden löscht keine gespeicherten Journaleinträge. Verbinde dein Google-Konto, um sie wieder anzuzeigen und zu synchronisieren.', edit:'Bearbeiten', delete:'Löschen', editJournalEntry:'Journaleintrag bearbeiten', deleteJournalEntry:'Journaleintrag löschen', restoreJournalSize:'Journalgröße wiederherstellen', expandJournal:'Journal vergrößern', restoreSize:'Größe wiederherstellen', weatherJournalPhoto:'Wetterjournalfoto', backedUpGooglePhotos:'In Google Fotos gesichert', savingGooglePhotos:'In Google Fotos speichern…', retryGooglePhotos:'Google-Fotos-Sicherung wiederholen', deleteJournalTitle:'Diesen Journaleintrag löschen?', deleteJournalMessage:'Der Eintrag wird von diesem Gerät entfernt und die Löschung mit deinem Google-Drive-Journal auf anderen Geräten synchronisiert.', fullSizeJournalPhoto:'Journalfoto in voller Größe', closePhotoPreview:'Fotovorschau schließen', journalOnlyToday:'Journaleinträge sind nur für heute möglich. Vergangene und zukünftige Daten sind schreibgeschützt.', journalOldDatesViewOnly:'Vergangene und zukünftige Journaldaten sind schreibgeschützt. Nur das heutige Journal kann bearbeitet werden.', journalSaved:'Journaleintrag gespeichert für', selectDateToView:'Wähle dieses Datum im Kalender aus, um ihn anzuzeigen.', savedOnDevice:'Auf diesem Gerät gespeichert.', journalReconnectDrive:'Das Google-Konto ist gespeichert, aber die Cloud-Synchronisierung ist pausiert. Verbinde Google erneut, um den Drive-Zugriff zu erneuern.', journalReadError:'Gespeicherte Journaleinträge konnten nicht gelesen werden. Vorhandene Daten wurden nicht überschrieben.', journalSaveError:'Journaländerungen wurden nicht gespeichert. Der Gerätespeicher kann voll oder nicht verfügbar sein.', photosSaved:'Fotos wurden in Google Fotos gespeichert. Lokales Journal und Fotos bleiben ebenfalls erhalten.', photosNeedBackup:'Einige Fotos müssen noch gesichert werden. Nutze Google-Fotos-Sicherung wiederholen.', localPhotosKept:'Lokales Journal und Fotos bleiben erhalten.', cloudSyncFailed:'Cloud-Journal-Synchronisierung fehlgeschlagen.', journalCloudPaused:'Erneuere den Google-Zugriff, bevor du diese Fotos sicherst.', savingJournalPhotos:'Journalfotos werden in Google Fotos gespeichert…', installPending:'Bestätige oder brich im Installationsdialog deines Browsers ab.', installAccepted:'Installation angefordert. Dein Browser schließt die WeatherNow-Installation ab.', installCancelled:'Installation abgebrochen. Du kannst dieses Dashboard weiter nutzen.', installError:'Der Browser konnte die Installation nicht öffnen. Nutze App installieren oder Zum Startbildschirm hinzufügen.', installQuestion:'WeatherNow auf diesem Gerät installieren?', installHttps:'Für die Installation ist HTTPS erforderlich. Öffne die sichere WeatherNow-Adresse.', installIos:'Nutze im Browser Teilen und dann Zum Home-Bildschirm.', installUnavailable:'Der Browser hat die Installation noch nicht angeboten. Nutze das Installationsmenü, falls verfügbar.', notNow:'Nicht jetzt', close:'Schließen', closeInstallMessage:'Installationsmeldung schließen' },
};

const languageAlias: Record<string, string> = { 'pt-BR':'pt', 'zh-CN':'zh' };

// Languages not explicitly overridden here still get a compact native translation
// for the requested surfaces below. This keeps English as a safe fallback for any
// future/unknown language code while preserving all existing dashboard languages.
const compact: Record<string, Partial<UiLabels>> = {
  it: { searchCities:'Cerca città...', searchingCities:'Ricerca città…', citySearchUnavailable:'Ricerca città non disponibile. Riprova.', noMatchingCities:'Nessuna città corrispondente.', signOut:'Esci', cancel:'Annulla', logout:'Esci', weatherAlert:'ALLERTA METEO', effective:'In vigore', source:'Fonte', connecting:'Connessione…', renewGoogleAccess:'Rinnova accesso Google', connectGoogleCalendar:'Collega Google Calendar', holidaysReminders:'Festività e promemoria', holiday:'Festività', reminder:'Promemoria', allDay:'Tutto il giorno', todayUpper:'OGGI', journalMarker:'Diario', personalWeatherJournal:'Diario meteo personale', addPhotos:'Aggiungi foto', saveChanges:'Salva modifiche', saveJournalEntry:'Salva voce del diario', cancelEdit:'Annulla modifica', edit:'Modifica', delete:'Elimina', deleteJournalTitle:'Eliminare questa voce del diario?', notNow:'Non ora', close:'Chiudi',signOutGoogleTitle:'Uscire da Google?',signOutGoogleCalendarTitle:'Uscire da Google Calendar?',signOutGoogleMessage:'Il tuo diario rimane salvato. Accedi di nuovo con questo account Google per riprendere la sincronizzazione Drive tra dispositivi.',signOutCalendarMessage:'Le voci e le foto locali del diario resteranno salvate. Gli aggiornamenti del calendario e la sincronizzazione cloud del diario saranno sospesi finché non ti riconnetti.',pagasaDailyNoOnset:'previsione giornaliera PAGASA; ora di inizio non pubblicata',nowInEffect:'ora / già in vigore',calendarOffline:'Offline: account e diario restano disponibili. Gli aggiornamenti di Google Calendar richiedono Internet.',calendarRemembered:'Il tuo account è memorizzato. Rinnova l’accesso Google per aggiornare il calendario e salvare nuove foto.',viewingJournalFor:'Diario visualizzato per',savedRecord:'voce salvata',savedRecords:'voci salvate',connectGoogleToRecord:'Collega il tuo account Google per registrare una voce del diario',recordObservation:'Registra pioggia, allagamenti, temperatura, visibilità o altre osservazioni…',viewOnlyPlaceholder:'Le date passate e future sono in sola lettura. È possibile registrare solo il diario di oggi.',deleteJournalMessage:'Questo rimuoverà la voce da questo dispositivo e sincronizzerà l’eliminazione con il diario Google Drive sugli altri dispositivi.' },
  pt: { searchCities:'Pesquisar cidades...', searchingCities:'Pesquisando cidades…', citySearchUnavailable:'Pesquisa de cidades indisponível. Tente novamente.', noMatchingCities:'Nenhuma cidade correspondente.', signOut:'Sair', cancel:'Cancelar', logout:'Sair', weatherAlert:'ALERTA METEOROLÓGICO', effective:'Válido', source:'Fonte', connecting:'Conectando…', renewGoogleAccess:'Renovar acesso do Google', connectGoogleCalendar:'Conectar Google Calendar', holidaysReminders:'Feriados e lembretes', holiday:'Feriado', reminder:'Lembrete', allDay:'Dia inteiro', todayUpper:'HOJE', journalMarker:'Diário', personalWeatherJournal:'Diário meteorológico pessoal', addPhotos:'Adicionar fotos', saveChanges:'Salvar alterações', saveJournalEntry:'Salvar entrada do diário', cancelEdit:'Cancelar edição', edit:'Editar', delete:'Excluir', deleteJournalTitle:'Excluir esta entrada do diário?', notNow:'Agora não', close:'Fechar',signOutGoogleTitle:'Sair do Google?',signOutGoogleCalendarTitle:'Sair do Google Calendar?',signOutGoogleMessage:'Seu diário continua salvo. Entre novamente com esta conta Google para retomar a sincronização do Drive entre dispositivos.',signOutCalendarMessage:'Seus registros e fotos locais do diário permanecerão salvos. As atualizações do calendário e a sincronização do diário na nuvem ficarão pausadas até você reconectar.',pagasaDailyNoOnset:'previsão diária da PAGASA; horário de início não publicado',nowInEffect:'agora / já em vigor',calendarOffline:'Offline: sua conta e diário continuam disponíveis. As atualizações do Google Calendar exigem internet.',calendarRemembered:'Sua conta está salva. Renove o acesso do Google para atualizar o calendário e fazer backup de novas fotos.',viewingJournalFor:'Visualizando diário de',savedRecord:'registro salvo',savedRecords:'registros salvos',connectGoogleToRecord:'Conecte sua conta Google para registrar uma entrada',recordObservation:'Registre chuva, alagamento, temperatura, visibilidade ou outras observações…',viewOnlyPlaceholder:'Datas passadas e futuras são somente leitura. Apenas o diário de hoje pode ser registrado.',deleteJournalMessage:'Isso removerá a entrada deste dispositivo e sincronizará a exclusão com seu diário do Google Drive nos outros dispositivos.' },
  ja: { searchCities:'都市を検索...', searchingCities:'都市を検索中…', citySearchUnavailable:'都市検索を利用できません。もう一度お試しください。', noMatchingCities:'一致する都市が見つかりません。', signOut:'ログアウト', cancel:'キャンセル', logout:'ログアウト', weatherAlert:'気象警報', effective:'有効', source:'情報源', connecting:'接続中…', renewGoogleAccess:'Google アクセスを更新', connectGoogleCalendar:'Google カレンダーに接続', holidaysReminders:'祝日とリマインダー', holiday:'祝日', reminder:'リマインダー', allDay:'終日', todayUpper:'今日', calendarEvent:'カレンダー予定', journalMarker:'日記', personalWeatherJournal:'個人天気日記', addPhotos:'写真を追加', saveChanges:'変更を保存', saveJournalEntry:'日記を保存', cancelEdit:'編集をキャンセル', edit:'編集', delete:'削除', deleteJournalTitle:'この日記を削除しますか？', notNow:'今はしない', close:'閉じる',signOutGoogleTitle:'Google からログアウトしますか？',signOutGoogleCalendarTitle:'Google カレンダーからログアウトしますか？',signOutGoogleMessage:'日記は保存されたままです。この Google アカウントで再度ログインすると、端末間の Drive 同期を再開できます。',signOutCalendarMessage:'ローカルの日記と写真は保存されたままです。再接続するまでカレンダー更新とクラウド日記同期は停止します。',pagasaDailyNoOnset:'PAGASA 日次見通し。開始時刻は公表されていません',nowInEffect:'現在 / すでに有効',calendarOffline:'オフラインです。アカウントと日記は利用できますが、Google カレンダーの更新にはインターネットが必要です。',calendarRemembered:'アカウントは記憶されています。カレンダー更新と新しい写真のバックアップのため Google アクセスを更新してください。',viewingJournalFor:'表示中の日記',savedRecord:'保存済み記録',savedRecords:'保存済み記録',connectGoogleToRecord:'日記を記録するには Google アカウントを接続してください',recordObservation:'雨、洪水、気温、視界、その他の観測を記録…',viewOnlyPlaceholder:'過去と未来の日付は閲覧のみです。今日の日記のみ記録できます。',deleteJournalMessage:'この端末から記録を削除し、他の端末の Google Drive 日記にも削除を同期します。' },
  ko: { searchCities:'도시 검색...', searchingCities:'도시 검색 중…', citySearchUnavailable:'도시 검색을 사용할 수 없습니다. 다시 시도하세요.', noMatchingCities:'일치하는 도시가 없습니다.', signOut:'로그아웃', cancel:'취소', logout:'로그아웃', weatherAlert:'기상 경보', effective:'발효', source:'출처', connecting:'연결 중…', renewGoogleAccess:'Google 액세스 갱신', connectGoogleCalendar:'Google 캘린더 연결', holidaysReminders:'공휴일 및 알림', holiday:'공휴일', reminder:'알림', allDay:'하루 종일', todayUpper:'오늘', calendarEvent:'캘린더 일정', journalMarker:'일지', personalWeatherJournal:'개인 날씨 일지', addPhotos:'사진 추가', saveChanges:'변경 저장', saveJournalEntry:'일지 저장', cancelEdit:'편집 취소', edit:'편집', delete:'삭제', deleteJournalTitle:'이 일지 항목을 삭제할까요?', notNow:'나중에', close:'닫기',signOutGoogleTitle:'Google에서 로그아웃할까요?',signOutGoogleCalendarTitle:'Google 캘린더에서 로그아웃할까요?',signOutGoogleMessage:'일지는 계속 저장됩니다. 이 Google 계정으로 다시 로그인하면 기기 간 Drive 동기화를 재개할 수 있습니다.',signOutCalendarMessage:'로컬 일지와 사진은 계속 저장됩니다. 다시 연결할 때까지 캘린더 업데이트와 클라우드 일지 동기화가 중지됩니다.',pagasaDailyNoOnset:'PAGASA 일일 전망; 시작 시각 미발표',nowInEffect:'현재 / 이미 발효',calendarOffline:'오프라인: 계정과 일지는 계속 사용할 수 있습니다. Google 캘린더 업데이트에는 인터넷이 필요합니다.',calendarRemembered:'계정이 기억되어 있습니다. 캘린더 업데이트와 새 사진 백업을 위해 Google 액세스를 갱신하세요.',viewingJournalFor:'일지 보기',savedRecord:'저장된 기록',savedRecords:'저장된 기록',connectGoogleToRecord:'일지를 기록하려면 Google 계정을 연결하세요',recordObservation:'비, 침수, 기온, 가시거리 또는 기타 관측 내용을 기록하세요…',viewOnlyPlaceholder:'과거와 미래 날짜는 읽기 전용입니다. 오늘의 일지만 기록할 수 있습니다.',deleteJournalMessage:'이 기기에서 항목을 삭제하고 다른 기기의 Google Drive 일지에도 삭제를 동기화합니다.' },
  zh: { searchCities:'搜索城市...', searchingCities:'正在搜索城市…', citySearchUnavailable:'城市搜索不可用，请重试。', noMatchingCities:'未找到匹配的城市。', signOut:'退出登录', cancel:'取消', logout:'退出登录', weatherAlert:'天气警报', effective:'生效', source:'来源', connecting:'正在连接…', renewGoogleAccess:'续期 Google 访问权限', connectGoogleCalendar:'连接 Google 日历', holidaysReminders:'节假日和提醒', holiday:'节假日', reminder:'提醒', allDay:'全天', todayUpper:'今天', calendarEvent:'日历事件', journalMarker:'日志', personalWeatherJournal:'个人天气日志', addPhotos:'添加照片', saveChanges:'保存更改', saveJournalEntry:'保存日志', cancelEdit:'取消编辑', edit:'编辑', delete:'删除', deleteJournalTitle:'删除此日志条目？', notNow:'暂不', close:'关闭',signOutGoogleTitle:'退出 Google？',signOutGoogleCalendarTitle:'退出 Google 日历？',signOutGoogleMessage:'你的日志仍会保留。再次使用此 Google 帐号登录即可恢复设备间的 Drive 同步。',signOutCalendarMessage:'本地日志记录和照片会继续保留。重新连接前，日历更新和云端日志同步将暂停。',pagasaDailyNoOnset:'PAGASA 每日展望；未公布开始时间',nowInEffect:'现在 / 已生效',calendarOffline:'离线：你的帐号和日志仍可使用。Google 日历更新需要互联网。',calendarRemembered:'帐号已记住。续期 Google 访问权限以更新日历并备份新照片。',viewingJournalFor:'正在查看日志日期',savedRecord:'条已保存记录',savedRecords:'条已保存记录',connectGoogleToRecord:'连接 Google 帐号以记录日志',recordObservation:'记录降雨、积水、温度、能见度或其他观察…',viewOnlyPlaceholder:'过去和未来日期仅可查看。只能记录今天的日志。',deleteJournalMessage:'这会从此设备删除该日志，并将删除同步到其他设备上的 Google Drive 日志。' },
  hi: { searchCities:'शहर खोजें...', searchingCities:'शहर खोजे जा रहे हैं…', citySearchUnavailable:'शहर खोज उपलब्ध नहीं है। फिर प्रयास करें।', noMatchingCities:'कोई मेल खाता शहर नहीं मिला।', signOut:'साइन आउट', cancel:'रद्द करें', logout:'लॉग आउट', weatherAlert:'मौसम चेतावनी', effective:'प्रभावी', source:'स्रोत', connecting:'कनेक्ट हो रहा है…', renewGoogleAccess:'Google एक्सेस नवीनीकृत करें', connectGoogleCalendar:'Google Calendar कनेक्ट करें', holidaysReminders:'छुट्टियाँ और रिमाइंडर', holiday:'छुट्टी', reminder:'रिमाइंडर', allDay:'पूरा दिन', todayUpper:'आज', calendarEvent:'कैलेंडर इवेंट', journalMarker:'जर्नल', personalWeatherJournal:'व्यक्तिगत मौसम जर्नल', addPhotos:'फ़ोटो जोड़ें', saveChanges:'बदलाव सहेजें', saveJournalEntry:'जर्नल प्रविष्टि सहेजें', cancelEdit:'संपादन रद्द करें', edit:'संपादित करें', delete:'हटाएँ', deleteJournalTitle:'यह जर्नल प्रविष्टि हटाएँ?', notNow:'अभी नहीं', close:'बंद करें',signOutGoogleTitle:'Google से साइन आउट करें?',signOutGoogleCalendarTitle:'Google Calendar से साइन आउट करें?',signOutGoogleMessage:'आपका जर्नल सहेजा रहेगा। सभी डिवाइस पर Drive सिंक फिर शुरू करने के लिए इसी Google खाते से दोबारा साइन इन करें।',signOutCalendarMessage:'आपके स्थानीय जर्नल रिकॉर्ड और फ़ोटो सहेजे रहेंगे। दोबारा कनेक्ट होने तक कैलेंडर अपडेट और क्लाउड जर्नल सिंक रुके रहेंगे।',pagasaDailyNoOnset:'PAGASA दैनिक पूर्वानुमान; आरंभ समय प्रकाशित नहीं',nowInEffect:'अभी / पहले से प्रभावी',calendarOffline:'ऑफ़लाइन: आपका खाता और जर्नल उपलब्ध हैं। Google Calendar अपडेट के लिए इंटरनेट चाहिए।',calendarRemembered:'आपका खाता याद रखा गया है। कैलेंडर अपडेट और नई फ़ोटो बैकअप के लिए Google एक्सेस नवीनीकृत करें।',viewingJournalFor:'जर्नल देख रहे हैं',savedRecord:'सहेजा रिकॉर्ड',savedRecords:'सहेजे रिकॉर्ड',connectGoogleToRecord:'जर्नल दर्ज करने के लिए Google खाता कनेक्ट करें',recordObservation:'बारिश, जलभराव, तापमान, दृश्यता या अन्य अवलोकन दर्ज करें…',viewOnlyPlaceholder:'पिछली और भविष्य की तिथियाँ केवल देखने के लिए हैं। केवल आज का जर्नल दर्ज किया जा सकता है।',deleteJournalMessage:'यह प्रविष्टि इस डिवाइस से हटेगी और अन्य डिवाइस पर Google Drive जर्नल में भी हटाना सिंक होगा।' },
  ru: { searchCities:'Поиск городов...', searchingCities:'Поиск городов…', citySearchUnavailable:'Поиск городов недоступен. Повторите попытку.', noMatchingCities:'Подходящие города не найдены.', signOut:'Выйти', cancel:'Отмена', logout:'Выйти', weatherAlert:'ПРЕДУПРЕЖДЕНИЕ О ПОГОДЕ', effective:'Действует', source:'Источник', connecting:'Подключение…', renewGoogleAccess:'Обновить доступ Google', connectGoogleCalendar:'Подключить Google Calendar', holidaysReminders:'Праздники и напоминания', holiday:'Праздник', reminder:'Напоминание', allDay:'Весь день', todayUpper:'СЕГОДНЯ', calendarEvent:'Событие календаря', journalMarker:'Журнал', personalWeatherJournal:'Личный погодный журнал', addPhotos:'Добавить фото', saveChanges:'Сохранить изменения', saveJournalEntry:'Сохранить запись', cancelEdit:'Отменить редактирование', edit:'Изменить', delete:'Удалить', deleteJournalTitle:'Удалить эту запись журнала?', notNow:'Не сейчас', close:'Закрыть',signOutGoogleTitle:'Выйти из Google?',signOutGoogleCalendarTitle:'Выйти из Google Calendar?',signOutGoogleMessage:'Журнал останется сохранён. Войдите снова в этот аккаунт Google, чтобы возобновить синхронизацию Drive между устройствами.',signOutCalendarMessage:'Локальные записи журнала и фотографии останутся сохранены. Обновления календаря и облачная синхронизация журнала будут приостановлены до повторного подключения.',pagasaDailyNoOnset:'суточный прогноз PAGASA; время начала не опубликовано',nowInEffect:'сейчас / уже действует',calendarOffline:'Нет сети: аккаунт и журнал доступны. Для обновлений Google Calendar нужен интернет.',calendarRemembered:'Аккаунт сохранён. Обновите доступ Google, чтобы обновлять календарь и резервировать новые фотографии.',viewingJournalFor:'Журнал за',savedRecord:'сохранённая запись',savedRecords:'сохранённых записей',connectGoogleToRecord:'Подключите аккаунт Google, чтобы добавить запись',recordObservation:'Запишите дождь, подтопление, температуру, видимость или другие наблюдения…',viewOnlyPlaceholder:'Прошлые и будущие даты доступны только для просмотра. Записывать можно только сегодняшний журнал.',deleteJournalMessage:'Запись будет удалена с этого устройства, а удаление синхронизируется с журналом Google Drive на других устройствах.' },
  ar: { searchCities:'ابحث عن المدن...', searchingCities:'جارٍ البحث عن المدن…', citySearchUnavailable:'البحث عن المدن غير متاح. حاول مرة أخرى.', noMatchingCities:'لم يتم العثور على مدن مطابقة.', signOut:'تسجيل الخروج', cancel:'إلغاء', logout:'تسجيل الخروج', weatherAlert:'تنبيه جوي', effective:'ساري', source:'المصدر', connecting:'جارٍ الاتصال…', renewGoogleAccess:'تجديد وصول Google', connectGoogleCalendar:'ربط Google Calendar', holidaysReminders:'العطلات والتذكيرات', holiday:'عطلة', reminder:'تذكير', allDay:'طوال اليوم', todayUpper:'اليوم', calendarEvent:'حدث تقويم', journalMarker:'اليوميات', personalWeatherJournal:'يوميات الطقس الشخصية', addPhotos:'إضافة صور', saveChanges:'حفظ التغييرات', saveJournalEntry:'حفظ إدخال اليوميات', cancelEdit:'إلغاء التعديل', edit:'تعديل', delete:'حذف', deleteJournalTitle:'حذف إدخال اليوميات هذا؟', notNow:'ليس الآن', close:'إغلاق',signOutGoogleTitle:'تسجيل الخروج من Google؟',signOutGoogleCalendarTitle:'تسجيل الخروج من Google Calendar؟',signOutGoogleMessage:'ستبقى يومياتك محفوظة. سجّل الدخول مجددًا بهذا الحساب لاستئناف مزامنة Drive بين الأجهزة.',signOutCalendarMessage:'ستبقى سجلات اليوميات والصور المحلية محفوظة. ستتوقف تحديثات التقويم ومزامنة اليوميات السحابية حتى تعيد الاتصال.',pagasaDailyNoOnset:'توقع PAGASA اليومي؛ لم يُنشر وقت بدء',nowInEffect:'الآن / ساري بالفعل',calendarOffline:'غير متصل: حسابك ويومياتك ما زالا متاحين. تحديثات Google Calendar تتطلب الإنترنت.',calendarRemembered:'تم تذكر حسابك. جدد وصول Google لتحديث التقويم ونسخ الصور الجديدة احتياطيًا.',viewingJournalFor:'عرض يوميات',savedRecord:'سجل محفوظ',savedRecords:'سجلات محفوظة',connectGoogleToRecord:'اربط حساب Google لتسجيل إدخال في اليوميات',recordObservation:'سجل المطر أو الفيضانات أو الحرارة أو الرؤية أو ملاحظات أخرى…',viewOnlyPlaceholder:'التواريخ الماضية والمستقبلية للعرض فقط. يمكن تسجيل يوميات اليوم فقط.',deleteJournalMessage:'سيؤدي هذا إلى حذف الإدخال من هذا الجهاز ومزامنة الحذف مع يوميات Google Drive على أجهزتك الأخرى.' },
};

const requestedSurfaceOverrides: Record<string, Partial<UiLabels>> = {
  it: { openSignOut:'Apri conferma di disconnessione', signOutGoogleTitle:'Uscire da Google?', signOutGoogleCalendarTitle:'Uscire da Google Calendar?', signOutGoogleMessage:'Il diario resta salvato. Accedi di nuovo con questo account Google per riprendere la sincronizzazione Drive tra i dispositivi.', signOutCalendarMessage:'I registri e le foto locali del diario restano salvati. Gli aggiornamenti del calendario e la sincronizzazione cloud restano in pausa finché non ti riconnetti.', pagasaDailyNoOnset:'previsione giornaliera PAGASA; nessun orario di inizio pubblicato', nowInEffect:'ora / già in vigore', calendarOffline:'Offline: account e diario restano disponibili. Gli aggiornamenti di Google Calendar richiedono Internet.', calendarRemembered:'Il tuo account è memorizzato. Rinnova l’accesso Google per aggiornare il calendario e salvare nuove foto.', closeHolidaysReminders:'Chiudi festività e promemoria', viewingJournalFor:'Visualizzazione diario per', savedRecord:'record salvato', savedRecords:'record salvati', connectGoogleToRecord:'Collega il tuo account Google per registrare una voce', recordObservation:'Registra pioggia, allagamenti, temperatura, visibilità o altre osservazioni…', viewOnlyPlaceholder:'Le date passate e future sono di sola lettura. Si può registrare solo oggi.', selectedJournalPhoto:'Foto selezionata del diario', removeSelectedPhoto:'Rimuovi foto selezionata', viewOnlyToday:'Solo lettura — il diario può essere registrato solo oggi', signedOutJournalInfo:'La disconnessione non elimina i registri salvati. Collega il tuo account Google per visualizzarli e sincronizzarli.', editJournalEntry:'Modifica voce del diario', deleteJournalEntry:'Elimina voce del diario', restoreJournalSize:'Ripristina dimensione diario', expandJournal:'Espandi diario', restoreSize:'Ripristina dimensione', weatherJournalPhoto:'Foto del diario meteo', backedUpGooglePhotos:'Backup su Google Photos completato', savingGooglePhotos:'Salvataggio su Google Photos…', retryGooglePhotos:'Riprova backup Google Photos', deleteJournalMessage:'La voce verrà rimossa da questo dispositivo e la cancellazione verrà sincronizzata con il diario Google Drive sugli altri dispositivi.', fullSizeJournalPhoto:'Foto del diario a dimensione intera', closePhotoPreview:'Chiudi anteprima foto', journalOnlyToday:'Il diario può essere registrato solo per oggi. Le date passate e future sono di sola lettura.', journalOldDatesViewOnly:'Le date passate e future sono di sola lettura. È possibile modificare solo il diario di oggi.', installPending:'Conferma o annulla nel messaggio di installazione del browser.', installAccepted:'Installazione richiesta. Il browser completerà l’installazione di WeatherNow.', installCancelled:'Installazione annullata. Puoi continuare a usare il dashboard.', installError:'Il browser non ha potuto aprire l’installazione. Usa Installa app o Aggiungi alla schermata Home.', installQuestion:'Installare WeatherNow su questo dispositivo?', installHttps:'L’installazione richiede HTTPS. Apri l’indirizzo sicuro di WeatherNow.', installIos:'Usa il menu Condividi del browser, quindi Aggiungi alla schermata Home.', installUnavailable:'Il browser non ha ancora proposto l’installazione. Usa il menu di installazione se disponibile.', closeInstallMessage:'Chiudi messaggio di installazione' },
  pt: { openSignOut:'Abrir confirmação de saída', signOutGoogleTitle:'Sair do Google?', signOutGoogleCalendarTitle:'Sair do Google Calendar?', signOutGoogleMessage:'Seu diário continua salvo. Entre novamente com esta conta Google para retomar a sincronização do Drive entre dispositivos.', signOutCalendarMessage:'Os registros e fotos locais do diário continuarão salvos. As atualizações do calendário e a sincronização em nuvem ficarão pausadas até reconectar.', pagasaDailyNoOnset:'previsão diária da PAGASA; sem horário de início publicado', nowInEffect:'agora / já em vigor', calendarOffline:'Offline: sua conta e diário continuam disponíveis. Atualizações do Google Calendar exigem internet.', calendarRemembered:'Sua conta está lembrada. Renove o acesso do Google para atualizar o calendário e salvar novas fotos.', closeHolidaysReminders:'Fechar feriados e lembretes', viewingJournalFor:'Visualizando diário de', savedRecord:'registro salvo', savedRecords:'registros salvos', connectGoogleToRecord:'Conecte sua conta Google para registrar uma entrada', recordObservation:'Registre chuva, alagamento, temperatura, visibilidade ou outras observações…', viewOnlyPlaceholder:'Datas anteriores e futuras são somente leitura. Só é possível registrar hoje.', selectedJournalPhoto:'Foto selecionada do diário', removeSelectedPhoto:'Remover foto selecionada', viewOnlyToday:'Somente leitura — o diário só pode ser registrado hoje', signedOutJournalInfo:'Sair não apaga registros salvos. Conecte sua conta Google para visualizá-los e sincronizá-los.', editJournalEntry:'Editar entrada do diário', deleteJournalEntry:'Excluir entrada do diário', restoreJournalSize:'Restaurar tamanho do diário', expandJournal:'Expandir diário', restoreSize:'Restaurar tamanho', weatherJournalPhoto:'Foto do diário meteorológico', backedUpGooglePhotos:'Backup no Google Photos concluído', savingGooglePhotos:'Salvando no Google Photos…', retryGooglePhotos:'Tentar backup no Google Photos novamente', deleteJournalMessage:'A entrada será removida deste dispositivo e a exclusão será sincronizada com o diário do Google Drive nos outros dispositivos.', fullSizeJournalPhoto:'Foto do diário em tamanho completo', closePhotoPreview:'Fechar visualização da foto', journalOnlyToday:'O diário só pode ser registrado hoje. Datas anteriores e futuras são somente leitura.', journalOldDatesViewOnly:'Datas anteriores e futuras são somente leitura. Só o diário de hoje pode ser editado.', installPending:'Confirme ou cancele no aviso de instalação do navegador.', installAccepted:'Instalação solicitada. O navegador concluirá a instalação do WeatherNow.', installCancelled:'Instalação cancelada. Você pode continuar usando o painel.', installError:'O navegador não conseguiu abrir a instalação. Use Instalar app ou Adicionar à tela inicial.', installQuestion:'Instalar WeatherNow neste dispositivo?', installHttps:'A instalação requer HTTPS. Abra o endereço seguro do WeatherNow.', installIos:'Use o menu Compartilhar e depois Adicionar à tela inicial.', installUnavailable:'O navegador ainda não ofereceu a instalação. Use o menu de instalação se disponível.', closeInstallMessage:'Fechar mensagem de instalação' },
  ja: { openSignOut:'ログアウト確認を開く', signOutGoogleTitle:'Google からログアウトしますか？', signOutGoogleCalendarTitle:'Google Calendar からログアウトしますか？', signOutGoogleMessage:'日記は保存されたままです。同じ Google アカウントで再度ログインすると、端末間の Drive 同期を再開できます。', signOutCalendarMessage:'この端末のローカル日記と写真は保存されたままです。再接続するまでカレンダー更新とクラウド同期は停止します。', pagasaDailyNoOnset:'PAGASA 日次見通し；開始時刻は公表されていません', nowInEffect:'現在 / すでに有効', calendarOffline:'オフライン：アカウントと日記は利用できます。Google Calendar の更新にはインターネットが必要です。', calendarRemembered:'アカウントは記憶されています。Google アクセスを更新するとカレンダーと写真バックアップを再開できます。', closeHolidaysReminders:'祝日とリマインダーを閉じる', viewingJournalFor:'日記の日付', savedRecord:'件保存', savedRecords:'件保存', connectGoogleToRecord:'日記を記録するには Google アカウントを接続してください', recordObservation:'雨、洪水、気温、視界などを記録…', viewOnlyPlaceholder:'過去と未来の日付は閲覧のみです。記録できるのは今日だけです。', selectedJournalPhoto:'選択した日記写真', removeSelectedPhoto:'選択写真を削除', viewOnlyToday:'閲覧のみ — 日記を記録できるのは今日だけです', signedOutJournalInfo:'ログアウトしても保存済みの日記は削除されません。Google アカウントを接続して表示と同期を再開してください。', editJournalEntry:'日記を編集', deleteJournalEntry:'日記を削除', restoreJournalSize:'日記サイズを戻す', expandJournal:'日記を拡大', restoreSize:'サイズを戻す', weatherJournalPhoto:'天気日記の写真', backedUpGooglePhotos:'Google Photos にバックアップ済み', savingGooglePhotos:'Google Photos に保存中…', retryGooglePhotos:'Google Photos バックアップを再試行', deleteJournalMessage:'この端末から削除され、Google Drive の日記にも削除が同期されます。', fullSizeJournalPhoto:'日記写真を全体表示', closePhotoPreview:'写真プレビューを閉じる', journalOnlyToday:'日記を記録できるのは今日だけです。過去と未来の日付は閲覧のみです。', journalOldDatesViewOnly:'過去と未来の日付は閲覧のみです。編集できるのは今日の日記だけです。', installPending:'ブラウザのインストール確認で承認またはキャンセルしてください。', installAccepted:'インストールを要求しました。ブラウザが WeatherNow のインストールを完了します。', installCancelled:'インストールをキャンセルしました。ダッシュボードは引き続き利用できます。', installError:'インストールを開けませんでした。アプリをインストール、またはホーム画面に追加を使用してください。', installQuestion:'この端末に WeatherNow をインストールしますか？', installHttps:'インストールには HTTPS が必要です。安全な WeatherNow アドレスを開いてください。', installIos:'ブラウザの共有メニューから「ホーム画面に追加」を選んでください。', installUnavailable:'ブラウザからまだインストールが提供されていません。利用可能ならインストールメニューを使用してください。', closeInstallMessage:'インストールメッセージを閉じる' },
  ko: { openSignOut:'로그아웃 확인 열기', signOutGoogleTitle:'Google에서 로그아웃할까요?', signOutGoogleCalendarTitle:'Google Calendar에서 로그아웃할까요?', signOutGoogleMessage:'일지는 저장된 상태로 유지됩니다. 같은 Google 계정으로 다시 로그인하면 기기 간 Drive 동기화를 재개할 수 있습니다.', signOutCalendarMessage:'이 기기의 일지와 사진은 저장된 상태로 유지됩니다. 다시 연결할 때까지 캘린더 업데이트와 클라우드 동기화가 일시 중지됩니다.', pagasaDailyNoOnset:'PAGASA 일일 전망; 시작 시각 미공개', nowInEffect:'현재 / 이미 발효 중', calendarOffline:'오프라인: 계정과 일지는 계속 사용할 수 있습니다. Google Calendar 업데이트에는 인터넷이 필요합니다.', calendarRemembered:'계정이 기억되어 있습니다. Google 액세스를 갱신하면 캘린더와 새 사진 백업을 업데이트할 수 있습니다.', closeHolidaysReminders:'공휴일 및 알림 닫기', viewingJournalFor:'일지 날짜', savedRecord:'개 저장됨', savedRecords:'개 저장됨', connectGoogleToRecord:'일지를 기록하려면 Google 계정을 연결하세요', recordObservation:'비, 침수, 기온, 시야 또는 기타 관찰 내용을 기록하세요…', viewOnlyPlaceholder:'과거와 미래 날짜는 보기 전용입니다. 오늘만 기록할 수 있습니다.', selectedJournalPhoto:'선택한 일지 사진', removeSelectedPhoto:'선택 사진 제거', viewOnlyToday:'보기 전용 — 오늘만 일지를 기록할 수 있습니다', signedOutJournalInfo:'로그아웃해도 저장된 일지는 삭제되지 않습니다. Google 계정을 연결해 다시 보고 동기화하세요.', editJournalEntry:'일지 편집', deleteJournalEntry:'일지 삭제', restoreJournalSize:'일지 크기 복원', expandJournal:'일지 확대', restoreSize:'크기 복원', weatherJournalPhoto:'날씨 일지 사진', backedUpGooglePhotos:'Google Photos에 백업됨', savingGooglePhotos:'Google Photos에 저장 중…', retryGooglePhotos:'Google Photos 백업 재시도', deleteJournalMessage:'이 기기에서 삭제되고 Google Drive 일지의 삭제가 다른 기기에도 동기화됩니다.', fullSizeJournalPhoto:'일지 사진 전체 크기', closePhotoPreview:'사진 미리보기 닫기', journalOnlyToday:'오늘만 일지를 기록할 수 있습니다. 과거와 미래 날짜는 보기 전용입니다.', journalOldDatesViewOnly:'과거와 미래 날짜는 보기 전용입니다. 오늘 일지만 편집할 수 있습니다.', installPending:'브라우저 설치 안내에서 확인하거나 취소하세요.', installAccepted:'설치를 요청했습니다. 브라우저가 WeatherNow 설치를 완료합니다.', installCancelled:'설치를 취소했습니다. 대시보드는 계속 사용할 수 있습니다.', installError:'브라우저에서 설치를 열 수 없습니다. 앱 설치 또는 홈 화면에 추가 메뉴를 사용하세요.', installQuestion:'이 기기에 WeatherNow를 설치할까요?', installHttps:'설치에는 HTTPS가 필요합니다. 안전한 WeatherNow 주소를 여세요.', installIos:'브라우저 공유 메뉴에서 홈 화면에 추가를 선택하세요.', installUnavailable:'브라우저에서 아직 설치를 제공하지 않았습니다. 사용 가능한 설치 메뉴를 이용하세요.', closeInstallMessage:'설치 메시지 닫기' },
  zh: { openSignOut:'打开退出确认', signOutGoogleTitle:'退出 Google？', signOutGoogleCalendarTitle:'退出 Google Calendar？', signOutGoogleMessage:'你的日记会保留。再次使用此 Google 账号登录即可恢复跨设备 Drive 同步。', signOutCalendarMessage:'此设备上的本地日记和照片会保留。重新连接前，日历更新和云端日记同步将暂停。', pagasaDailyNoOnset:'PAGASA 每日展望；未发布准确开始时间', nowInEffect:'现在 / 已生效', calendarOffline:'离线：账号和日记仍可使用。Google Calendar 更新需要网络。', calendarRemembered:'账号已记住。续期 Google 权限即可更新日历并备份新照片。', closeHolidaysReminders:'关闭节假日和提醒', viewingJournalFor:'查看日记日期', savedRecord:'条已保存', savedRecords:'条已保存', connectGoogleToRecord:'连接 Google 账号以记录日记', recordObservation:'记录降雨、积水、温度、能见度或其他观察…', viewOnlyPlaceholder:'过去和未来日期仅可查看。只有今天可以记录日记。', selectedJournalPhoto:'已选择的日记照片', removeSelectedPhoto:'移除所选照片', viewOnlyToday:'仅查看 — 只有今天可以记录日记', signedOutJournalInfo:'退出登录不会删除已保存的日记。连接 Google 账号即可重新查看和同步。', editJournalEntry:'编辑日记', deleteJournalEntry:'删除日记', restoreJournalSize:'恢复日记大小', expandJournal:'展开日记', restoreSize:'恢复大小', weatherJournalPhoto:'天气日记照片', backedUpGooglePhotos:'已备份到 Google Photos', savingGooglePhotos:'正在保存到 Google Photos…', retryGooglePhotos:'重试 Google Photos 备份', deleteJournalMessage:'它会从此设备删除，并将删除同步到其他设备上的 Google Drive 日记。', fullSizeJournalPhoto:'全尺寸日记照片', closePhotoPreview:'关闭照片预览', journalOnlyToday:'只有今天可以记录日记。过去和未来日期仅可查看。', journalOldDatesViewOnly:'过去和未来日期仅可查看。只有今天的日记可以编辑。', installPending:'请在浏览器安装提示中确认或取消。', installAccepted:'已请求安装。浏览器将完成 WeatherNow 安装。', installCancelled:'安装已取消。你仍可继续使用仪表板。', installError:'浏览器无法打开安装。请使用“安装应用”或“添加到主屏幕”。', installQuestion:'在此设备上安装 WeatherNow？', installHttps:'安装需要 HTTPS。请打开安全的 WeatherNow 地址。', installIos:'使用浏览器“共享”菜单，然后选择“添加到主屏幕”。', installUnavailable:'浏览器尚未提供安装。若有安装菜单，请使用该菜单。', closeInstallMessage:'关闭安装消息' },
  hi: { openSignOut:'साइन-आउट पुष्टि खोलें', signOutGoogleTitle:'Google से साइन आउट करें?', signOutGoogleCalendarTitle:'Google Calendar से साइन आउट करें?', signOutGoogleMessage:'आपका जर्नल सुरक्षित रहेगा। Drive सिंक फिर शुरू करने के लिए इसी Google खाते से दोबारा साइन इन करें।', signOutCalendarMessage:'इस डिवाइस पर स्थानीय जर्नल और फ़ोटो सुरक्षित रहेंगे। फिर से कनेक्ट होने तक कैलेंडर अपडेट और क्लाउड सिंक रुका रहेगा।', pagasaDailyNoOnset:'PAGASA दैनिक पूर्वानुमान; आरंभ समय प्रकाशित नहीं', nowInEffect:'अभी / पहले से प्रभावी', calendarOffline:'ऑफ़लाइन: आपका खाता और जर्नल उपलब्ध हैं। Google Calendar अपडेट के लिए इंटरनेट चाहिए।', calendarRemembered:'आपका खाता याद रखा गया है। कैलेंडर और नई फ़ोटो बैकअप के लिए Google एक्सेस नवीनीकृत करें।', closeHolidaysReminders:'छुट्टियाँ और रिमाइंडर बंद करें', viewingJournalFor:'जर्नल की तारीख', savedRecord:'सहेजा रिकॉर्ड', savedRecords:'सहेजे रिकॉर्ड', connectGoogleToRecord:'जर्नल लिखने के लिए Google खाता कनेक्ट करें', recordObservation:'बारिश, बाढ़, तापमान, दृश्यता या अन्य अवलोकन दर्ज करें…', viewOnlyPlaceholder:'पिछली और भविष्य की तारीखें केवल देखने के लिए हैं। सिर्फ आज रिकॉर्ड किया जा सकता है।', selectedJournalPhoto:'चुनी हुई जर्नल फ़ोटो', removeSelectedPhoto:'चुनी फ़ोटो हटाएँ', viewOnlyToday:'केवल देखें — जर्नल सिर्फ आज रिकॉर्ड किया जा सकता है', signedOutJournalInfo:'साइन आउट करने से सहेजे गए जर्नल रिकॉर्ड नहीं मिटते। देखने और सिंक के लिए Google खाता कनेक्ट करें।', editJournalEntry:'जर्नल प्रविष्टि संपादित करें', deleteJournalEntry:'जर्नल प्रविष्टि हटाएँ', restoreJournalSize:'जर्नल आकार बहाल करें', expandJournal:'जर्नल बड़ा करें', restoreSize:'आकार बहाल करें', weatherJournalPhoto:'मौसम जर्नल फ़ोटो', backedUpGooglePhotos:'Google Photos में बैकअप हो गया', savingGooglePhotos:'Google Photos में सहेजा जा रहा है…', retryGooglePhotos:'Google Photos बैकअप फिर आज़माएँ', deleteJournalMessage:'यह इस डिवाइस से हटेगी और Google Drive जर्नल में हटाना अन्य डिवाइसों पर सिंक होगा।', fullSizeJournalPhoto:'पूर्ण आकार जर्नल फ़ोटो', closePhotoPreview:'फ़ोटो पूर्वावलोकन बंद करें', journalOnlyToday:'जर्नल सिर्फ आज रिकॉर्ड किया जा सकता है। पिछली और भविष्य की तारीखें केवल देखने के लिए हैं।', journalOldDatesViewOnly:'पिछली और भविष्य की तारीखें केवल देखने के लिए हैं। सिर्फ आज का जर्नल संपादित किया जा सकता है।', installPending:'ब्राउज़र के इंस्टॉल संदेश में पुष्टि या रद्द करें।', installAccepted:'इंस्टॉलेशन का अनुरोध किया गया। ब्राउज़र WeatherNow इंस्टॉल पूरा करेगा।', installCancelled:'इंस्टॉलेशन रद्द किया गया। आप डैशबोर्ड का उपयोग जारी रख सकते हैं।', installError:'ब्राउज़र इंस्टॉलेशन नहीं खोल सका। Install App या Add to Home Screen का उपयोग करें।', installQuestion:'इस डिवाइस पर WeatherNow इंस्टॉल करें?', installHttps:'इंस्टॉलेशन के लिए HTTPS चाहिए। सुरक्षित WeatherNow पता खोलें।', installIos:'ब्राउज़र का Share मेनू खोलें, फिर Add to Home Screen चुनें।', installUnavailable:'ब्राउज़र ने अभी इंस्टॉलेशन की पेशकश नहीं की है। उपलब्ध इंस्टॉल मेनू का उपयोग करें।', closeInstallMessage:'इंस्टॉल संदेश बंद करें' },
  ru: { openSignOut:'Открыть подтверждение выхода', signOutGoogleTitle:'Выйти из Google?', signOutGoogleCalendarTitle:'Выйти из Google Calendar?', signOutGoogleMessage:'Ваш журнал останется сохранён. Войдите снова с этой учётной записью Google, чтобы возобновить синхронизацию Drive между устройствами.', signOutCalendarMessage:'Локальные записи журнала и фото останутся сохранены. Обновления календаря и облачная синхронизация будут приостановлены до повторного подключения.', pagasaDailyNoOnset:'суточный прогноз PAGASA; точное время начала не опубликовано', nowInEffect:'сейчас / уже действует', calendarOffline:'Офлайн: учётная запись и журнал доступны. Для обновлений Google Calendar нужен интернет.', calendarRemembered:'Учётная запись сохранена. Обновите доступ Google для календаря и резервного копирования новых фото.', closeHolidaysReminders:'Закрыть праздники и напоминания', viewingJournalFor:'Журнал за дату', savedRecord:'сохранённая запись', savedRecords:'сохранённых записей', connectGoogleToRecord:'Подключите Google, чтобы создать запись журнала', recordObservation:'Запишите дождь, подтопление, температуру, видимость или другие наблюдения…', viewOnlyPlaceholder:'Прошлые и будущие даты доступны только для просмотра. Записывать можно только сегодня.', selectedJournalPhoto:'Выбранное фото журнала', removeSelectedPhoto:'Удалить выбранное фото', viewOnlyToday:'Только просмотр — записи можно создавать только сегодня', signedOutJournalInfo:'Выход не удаляет сохранённые записи журнала. Подключите Google, чтобы снова их видеть и синхронизировать.', editJournalEntry:'Изменить запись журнала', deleteJournalEntry:'Удалить запись журнала', restoreJournalSize:'Восстановить размер журнала', expandJournal:'Развернуть журнал', restoreSize:'Восстановить размер', weatherJournalPhoto:'Фото погодного журнала', backedUpGooglePhotos:'Сохранено в Google Photos', savingGooglePhotos:'Сохранение в Google Photos…', retryGooglePhotos:'Повторить резервное копирование Google Photos', deleteJournalMessage:'Запись будет удалена с устройства, а удаление синхронизируется с журналом Google Drive на других устройствах.', fullSizeJournalPhoto:'Фото журнала в полном размере', closePhotoPreview:'Закрыть просмотр фото', journalOnlyToday:'Записи можно создавать только сегодня. Прошлые и будущие даты доступны только для просмотра.', journalOldDatesViewOnly:'Прошлые и будущие даты доступны только для просмотра. Редактировать можно только сегодняшний журнал.', installPending:'Подтвердите или отмените установку в окне браузера.', installAccepted:'Установка запрошена. Браузер завершит установку WeatherNow.', installCancelled:'Установка отменена. Можно продолжить пользоваться панелью.', installError:'Браузер не смог открыть установку. Используйте Установить приложение или Добавить на главный экран.', installQuestion:'Установить WeatherNow на это устройство?', installHttps:'Для установки нужен HTTPS. Откройте защищённый адрес WeatherNow.', installIos:'Откройте меню Поделиться и выберите Добавить на экран «Домой».', installUnavailable:'Браузер ещё не предложил установку. Используйте меню установки, если оно доступно.', closeInstallMessage:'Закрыть сообщение установки' },
  ar: { openSignOut:'فتح تأكيد تسجيل الخروج', signOutGoogleTitle:'تسجيل الخروج من Google؟', signOutGoogleCalendarTitle:'تسجيل الخروج من Google Calendar؟', signOutGoogleMessage:'ستبقى يومياتك محفوظة. سجّل الدخول مرة أخرى بالحساب نفسه لاستئناف مزامنة Drive بين الأجهزة.', signOutCalendarMessage:'ستبقى سجلات اليوميات والصور المحلية محفوظة. ستتوقف تحديثات التقويم والمزامنة السحابية حتى تعيد الاتصال.', pagasaDailyNoOnset:'توقع PAGASA اليومي؛ لم يُنشر وقت بداية محدد', nowInEffect:'الآن / ساري بالفعل', calendarOffline:'غير متصل: الحساب واليوميات ما زالا متاحين. تحديث Google Calendar يحتاج إلى الإنترنت.', calendarRemembered:'تم حفظ حسابك. جدّد وصول Google لتحديث التقويم ونسخ الصور الجديدة احتياطيًا.', closeHolidaysReminders:'إغلاق العطلات والتذكيرات', viewingJournalFor:'عرض اليوميات ليوم', savedRecord:'سجل محفوظ', savedRecords:'سجلات محفوظة', connectGoogleToRecord:'اربط حساب Google لتسجيل إدخال في اليوميات', recordObservation:'سجّل المطر أو الفيضانات أو الحرارة أو الرؤية أو ملاحظات أخرى…', viewOnlyPlaceholder:'التواريخ الماضية والمستقبلية للعرض فقط. يمكن التسجيل لليوم فقط.', selectedJournalPhoto:'صورة اليوميات المحددة', removeSelectedPhoto:'إزالة الصورة المحددة', viewOnlyToday:'للعرض فقط — يمكن تسجيل اليوميات لليوم فقط', signedOutJournalInfo:'تسجيل الخروج لا يحذف سجلات اليوميات المحفوظة. اربط حساب Google لعرضها ومزامنتها من جديد.', editJournalEntry:'تعديل سجل اليوميات', deleteJournalEntry:'حذف سجل اليوميات', restoreJournalSize:'استعادة حجم اليوميات', expandJournal:'توسيع اليوميات', restoreSize:'استعادة الحجم', weatherJournalPhoto:'صورة يوميات الطقس', backedUpGooglePhotos:'تم النسخ الاحتياطي إلى Google Photos', savingGooglePhotos:'جارٍ الحفظ في Google Photos…', retryGooglePhotos:'إعادة محاولة النسخ الاحتياطي إلى Google Photos', deleteJournalMessage:'سيُحذف السجل من هذا الجهاز وستتم مزامنة الحذف مع يوميات Google Drive على أجهزتك الأخرى.', fullSizeJournalPhoto:'صورة اليوميات بالحجم الكامل', closePhotoPreview:'إغلاق معاينة الصورة', journalOnlyToday:'يمكن تسجيل اليوميات لليوم فقط. التواريخ الماضية والمستقبلية للعرض فقط.', journalOldDatesViewOnly:'التواريخ الماضية والمستقبلية للعرض فقط. يمكن تعديل يوميات اليوم فقط.', installPending:'أكّد أو ألغِ من نافذة تثبيت المتصفح.', installAccepted:'تم طلب التثبيت. سيكمل المتصفح تثبيت WeatherNow.', installCancelled:'تم إلغاء التثبيت. يمكنك الاستمرار في استخدام لوحة المعلومات.', installError:'تعذر على المتصفح فتح التثبيت. استخدم تثبيت التطبيق أو إضافة إلى الشاشة الرئيسية.', installQuestion:'تثبيت WeatherNow على هذا الجهاز؟', installHttps:'يتطلب التثبيت HTTPS. افتح عنوان WeatherNow الآمن.', installIos:'استخدم قائمة المشاركة في المتصفح ثم إضافة إلى الشاشة الرئيسية.', installUnavailable:'لم يعرض المتصفح التثبيت بعد. استخدم قائمة التثبيت إن كانت متاحة.', closeInstallMessage:'إغلاق رسالة التثبيت' },
};

export function getUiLabels(language: string = 'en'): UiLabels {
  const code = languageAlias[language] || language;
  return { ...en, ...(overrides[code] || {}), ...(compact[code] || {}), ...(requestedSurfaceOverrides[code] || {}) };
}

export function fullCalendarLocale(language: string = 'en') {
  return language === 'pt' ? 'pt-br' : language === 'zh' ? 'zh-cn' : language;
}

export type MapUiLabels = {
  routeMap: string; weatherTrack: string; expandMap: string; exitFullscreen: string; loadingRouteMap: string; routeMapUnavailable: string;
  driving: string; transit: string; walk: string; cycling: string; flights: string; closeDirections: string;
  chooseStartingPoint: string; searchDestination: string; reverseLocations: string; findingRoute: string; start: string; stop: string;
  steps: string; hide: string; searchPlaces: string; searchAnyPlace: string; directions: string; routeMapType: string;
  mapStyleDescription: string; showYourLocation: string; zoomIn: string; zoomOut: string; muteVoice: string; unmuteVoice: string; closeVoiceNavigation: string;
  cycloneBulletin: string; feedUnavailable: string; loading: string; reportedBy: string; chooseCyclone: string; rainRadar: string;
  forecastTracks: string; uncertaintyCircles: string; trackLegend: string; source: string; issued: string; positionTime: string;
  olderAdvisory: string; officialAdvisory: string; forecastValid: string; hours: string; parsedBulletinPosition: string;
  bulletinTimeUnverified: string; officialPagasaBulletin: string; cycloneDataUnavailable: string; radarRefreshFailed: string;
  pagasaPrecipUnavailable: string; pagasaBulletinUnavailable: string; pagasaPositionAvailable: string; pagasaNoCoordinates: string;
  officialPagasaForecast: string; outsidePhilippinesSource: string; checkLocalWarnings: string;
  pagasaOutlook: string; severeWeatherWarning: string; upcomingSevereWeather: string;
};

const mapEn: MapUiLabels = {
  routeMap:'Route Map', weatherTrack:'Weather Track', expandMap:'Expand Map', exitFullscreen:'Exit Fullscreen', loadingRouteMap:'Loading Route Map…', routeMapUnavailable:'Route Map could not start on this device. Refresh the dashboard to try again.',
  driving:'Driving', transit:'Transit', walk:'Walk', cycling:'Cycling', flights:'Flights', closeDirections:'Close directions', chooseStartingPoint:'Choose starting point or place…', searchDestination:'Search place, mall, hotel, address…', reverseLocations:'Reverse starting point and destination', findingRoute:'Finding best real-time road route…', start:'Start', stop:'Stop', steps:'Steps', hide:'Hide', searchPlaces:'Search places, roads, landmarks…', searchAnyPlace:'Search any place or landmark', directions:'Directions', routeMapType:'Route Map Type', mapStyleDescription:'Open vector styles. Place labels can be selected for details and directions.', showYourLocation:'Show your location', zoomIn:'Zoom In', zoomOut:'Zoom Out', muteVoice:'Mute voice navigation', unmuteVoice:'Unmute voice navigation', closeVoiceNavigation:'Close voice navigation',
  cycloneBulletin:'Cyclone bulletin', feedUnavailable:'feed unavailable', loading:'loading…', reportedBy:'reported by NHC/JMA', chooseCyclone:'Choose cyclone to locate on map', rainRadar:'Rain radar', forecastTracks:'Forecast tracks', uncertaintyCircles:'JMA uncertainty circles', trackLegend:'Solid gray: reported past track. Dashed: agency forecast. Forecasts are uncertain.', source:'Source', issued:'Issued', positionTime:'Position time', olderAdvisory:'Older advisory — check the agency.', officialAdvisory:'Official advisory', forecastValid:'Forecast valid', hours:'hours', parsedBulletinPosition:'PAGASA parsed bulletin position', bulletinTimeUnverified:'Bulletin time not verified. No forecast inferred.', officialPagasaBulletin:'Official PAGASA bulletin', cycloneDataUnavailable:'Cyclone data unavailable — this is not an all-clear.', radarRefreshFailed:'Radar refresh temporarily failed; keeping the last available precipitation frame.', pagasaPrecipUnavailable:'PAGASA precipitation is unavailable. RainViewer radar remains active as backup.', pagasaBulletinUnavailable:'PAGASA bulletin unavailable.', pagasaPositionAvailable:'PAGASA bulletin position available; source time unverified.', pagasaNoCoordinates:'PAGASA parser supplied no cyclone coordinates. Check official bulletins.', officialPagasaForecast:'Official PAGASA forecast', outsidePhilippinesSource:'Weather forecasts outside the Philippines use Open-Meteo.', checkLocalWarnings:'These cyclone feeds do not cover every basin. Check your local weather authority for warnings.', pagasaOutlook:'PAGASA outlook', severeWeatherWarning:'Severe weather warning', upcomingSevereWeather:'Upcoming severe weather',
};

const mapOverrides: Record<string, Partial<MapUiLabels>> = {
  es:{ routeMap:'Mapa de rutas',weatherTrack:'Seguimiento meteorológico',expandMap:'Ampliar mapa',exitFullscreen:'Salir de pantalla completa',loadingRouteMap:'Cargando mapa de rutas…',routeMapUnavailable:'El mapa de rutas no pudo iniciarse. Actualiza el panel e inténtalo de nuevo.',driving:'Coche',transit:'Transporte',walk:'A pie',cycling:'Bicicleta',flights:'Vuelos',closeDirections:'Cerrar indicaciones',chooseStartingPoint:'Elegir punto de partida o lugar…',searchDestination:'Buscar lugar, centro comercial, hotel, dirección…',reverseLocations:'Invertir origen y destino',findingRoute:'Buscando la mejor ruta en tiempo real…',start:'Iniciar',stop:'Detener',steps:'Pasos',hide:'Ocultar',searchPlaces:'Buscar lugares, carreteras y puntos de referencia…',searchAnyPlace:'Buscar cualquier lugar o punto de referencia',directions:'Indicaciones',routeMapType:'Tipo de mapa',mapStyleDescription:'Estilos vectoriales abiertos. Selecciona etiquetas para ver detalles e indicaciones.',showYourLocation:'Mostrar tu ubicación',zoomIn:'Acercar',zoomOut:'Alejar',muteVoice:'Silenciar navegación por voz',unmuteVoice:'Activar navegación por voz',closeVoiceNavigation:'Cerrar navegación por voz',cycloneBulletin:'Boletín de ciclones',feedUnavailable:'fuente no disponible',loading:'cargando…',reportedBy:'reportados por NHC/JMA',chooseCyclone:'Elegir ciclón para localizar en el mapa',rainRadar:'Radar de lluvia',forecastTracks:'Trayectorias previstas',uncertaintyCircles:'Círculos de incertidumbre JMA',trackLegend:'Gris sólido: trayectoria pasada. Discontinua: pronóstico de agencia. Los pronósticos son inciertos.',source:'Fuente',issued:'Emitido',positionTime:'Hora de posición',olderAdvisory:'Aviso antiguo — consulta la agencia.',officialAdvisory:'Aviso oficial',forecastValid:'Pronóstico válido',hours:'horas',parsedBulletinPosition:'Posición analizada del boletín PAGASA',bulletinTimeUnverified:'Hora del boletín no verificada. No se infiere pronóstico.',officialPagasaBulletin:'Boletín oficial de PAGASA',cycloneDataUnavailable:'Datos de ciclones no disponibles — esto no significa que no haya peligro.',radarRefreshFailed:'Falló la actualización del radar; se mantiene el último cuadro disponible.',pagasaPrecipUnavailable:'La precipitación de PAGASA no está disponible. RainViewer sigue activo como respaldo.',pagasaBulletinUnavailable:'Boletín de PAGASA no disponible.',pagasaPositionAvailable:'Posición del boletín PAGASA disponible; hora de origen no verificada.',pagasaNoCoordinates:'El analizador de PAGASA no proporcionó coordenadas. Consulta los boletines oficiales.',officialPagasaForecast:'Pronóstico oficial de PAGASA',outsidePhilippinesSource:'Fuera de Filipinas, los pronósticos usan Open-Meteo.',checkLocalWarnings:'Estas fuentes de ciclones no cubren todas las cuencas. Consulta a tu autoridad meteorológica local.',pagasaOutlook:'Pronóstico de PAGASA',severeWeatherWarning:'Advertencia de tiempo severo',upcomingSevereWeather:'Tiempo severo próximo' },
  fr:{ routeMap:'Carte des itinéraires',weatherTrack:'Suivi météo',expandMap:'Agrandir la carte',exitFullscreen:'Quitter le plein écran',loadingRouteMap:'Chargement de la carte…',driving:'Voiture',transit:'Transports',walk:'Marche',cycling:'Vélo',flights:'Vols',closeDirections:'Fermer l’itinéraire',chooseStartingPoint:'Choisir un point de départ ou un lieu…',searchDestination:'Rechercher lieu, centre commercial, hôtel, adresse…',reverseLocations:'Inverser départ et destination',findingRoute:'Recherche du meilleur itinéraire en temps réel…',start:'Démarrer',stop:'Arrêter',steps:'Étapes',hide:'Masquer',searchPlaces:'Rechercher lieux, routes et repères…',searchAnyPlace:'Rechercher un lieu ou un repère',directions:'Itinéraire',routeMapType:'Type de carte',showYourLocation:'Afficher votre position',zoomIn:'Zoom avant',zoomOut:'Zoom arrière',muteVoice:'Couper la navigation vocale',unmuteVoice:'Activer la navigation vocale',closeVoiceNavigation:'Fermer la navigation vocale',cycloneBulletin:'Bulletin cyclonique',feedUnavailable:'flux indisponible',loading:'chargement…',reportedBy:'signalés par NHC/JMA',chooseCyclone:'Choisir un cyclone à localiser',rainRadar:'Radar de pluie',forecastTracks:'Trajectoires prévues',uncertaintyCircles:'Cercles d’incertitude JMA',trackLegend:'Gris plein : trajectoire passée. Pointillé : prévision d’agence. Les prévisions sont incertaines.',source:'Source',issued:'Émis',positionTime:'Heure de position',olderAdvisory:'Avis ancien — vérifiez l’agence.',officialAdvisory:'Avis officiel',forecastValid:'Prévision valide',hours:'heures',officialPagasaBulletin:'Bulletin officiel PAGASA',pagasaBulletinUnavailable:'Bulletin PAGASA indisponible.',officialPagasaForecast:'Prévision officielle PAGASA',outsidePhilippinesSource:'Hors des Philippines, les prévisions utilisent Open-Meteo.',pagasaOutlook:'Prévision PAGASA',severeWeatherWarning:'Avertissement météo sévère',upcomingSevereWeather:'Temps sévère à venir' },
  de:{ routeMap:'Routenkarte',weatherTrack:'Wetterverfolgung',expandMap:'Karte vergrößern',exitFullscreen:'Vollbild beenden',loadingRouteMap:'Routenkarte wird geladen…',driving:'Auto',transit:'ÖPNV',walk:'Zu Fuß',cycling:'Fahrrad',flights:'Flüge',closeDirections:'Route schließen',chooseStartingPoint:'Startpunkt oder Ort wählen…',searchDestination:'Ort, Einkaufszentrum, Hotel oder Adresse suchen…',reverseLocations:'Start und Ziel tauschen',findingRoute:'Beste Echtzeitroute wird gesucht…',start:'Start',stop:'Stopp',steps:'Schritte',hide:'Ausblenden',searchPlaces:'Orte, Straßen und Sehenswürdigkeiten suchen…',searchAnyPlace:'Ort oder Sehenswürdigkeit suchen',directions:'Route',routeMapType:'Kartentyp',showYourLocation:'Standort anzeigen',zoomIn:'Vergrößern',zoomOut:'Verkleinern',muteVoice:'Sprachnavigation stummschalten',unmuteVoice:'Sprachnavigation einschalten',closeVoiceNavigation:'Sprachnavigation schließen',cycloneBulletin:'Zyklon-Bulletin',feedUnavailable:'Feed nicht verfügbar',loading:'wird geladen…',reportedBy:'gemeldet von NHC/JMA',chooseCyclone:'Zyklon auf der Karte auswählen',rainRadar:'Regenradar',forecastTracks:'Vorhersagespuren',uncertaintyCircles:'JMA-Unsicherheitskreise',source:'Quelle',issued:'Ausgegeben',positionTime:'Positionszeit',olderAdvisory:'Ältere Meldung — Behörde prüfen.',officialAdvisory:'Offizielle Meldung',forecastValid:'Vorhersage gültig',hours:'Stunden',officialPagasaBulletin:'Offizielles PAGASA-Bulletin',pagasaBulletinUnavailable:'PAGASA-Bulletin nicht verfügbar.',officialPagasaForecast:'Offizielle PAGASA-Vorhersage',pagasaOutlook:'PAGASA-Ausblick',severeWeatherWarning:'Unwetterwarnung',upcomingSevereWeather:'Bevorstehendes Unwetter' },
  it:{ routeMap:'Mappa percorsi',weatherTrack:'Monitoraggio meteo',expandMap:'Espandi mappa',exitFullscreen:'Esci da schermo intero',driving:'Auto',transit:'Trasporto',walk:'A piedi',cycling:'Bicicletta',flights:'Voli',closeDirections:'Chiudi indicazioni',chooseStartingPoint:'Scegli punto di partenza o luogo…',searchDestination:'Cerca luogo, centro commerciale, hotel, indirizzo…',findingRoute:'Ricerca del percorso migliore in tempo reale…',start:'Avvia',stop:'Ferma',steps:'Passaggi',hide:'Nascondi',searchPlaces:'Cerca luoghi, strade e punti di riferimento…',directions:'Indicazioni',routeMapType:'Tipo di mappa',showYourLocation:'Mostra la tua posizione',zoomIn:'Ingrandisci',zoomOut:'Riduci',cycloneBulletin:'Bollettino cicloni',feedUnavailable:'feed non disponibile',loading:'caricamento…',chooseCyclone:'Scegli ciclone da localizzare',rainRadar:'Radar pioggia',forecastTracks:'Tracce previste',uncertaintyCircles:'Cerchi di incertezza JMA',source:'Fonte',issued:'Emesso',positionTime:'Ora posizione',officialAdvisory:'Avviso ufficiale',forecastValid:'Previsione valida',hours:'ore',officialPagasaBulletin:'Bollettino ufficiale PAGASA',officialPagasaForecast:'Previsione ufficiale PAGASA',pagasaOutlook:'Previsione PAGASA',severeWeatherWarning:'Avviso di maltempo grave',upcomingSevereWeather:'Maltempo grave in arrivo' },
  pt:{ routeMap:'Mapa de rotas',weatherTrack:'Rastreamento meteorológico',expandMap:'Expandir mapa',exitFullscreen:'Sair da tela cheia',driving:'Carro',transit:'Transporte',walk:'A pé',cycling:'Bicicleta',flights:'Voos',closeDirections:'Fechar rotas',chooseStartingPoint:'Escolha o ponto de partida ou lugar…',searchDestination:'Pesquisar lugar, shopping, hotel, endereço…',findingRoute:'Buscando a melhor rota em tempo real…',start:'Iniciar',stop:'Parar',steps:'Etapas',hide:'Ocultar',searchPlaces:'Pesquisar lugares, estradas e pontos de referência…',directions:'Rotas',routeMapType:'Tipo de mapa',showYourLocation:'Mostrar sua localização',zoomIn:'Aumentar zoom',zoomOut:'Diminuir zoom',cycloneBulletin:'Boletim de ciclone',feedUnavailable:'feed indisponível',loading:'carregando…',chooseCyclone:'Escolher ciclone no mapa',rainRadar:'Radar de chuva',forecastTracks:'Trajetórias previstas',uncertaintyCircles:'Círculos de incerteza JMA',source:'Fonte',issued:'Emitido',positionTime:'Hora da posição',officialAdvisory:'Aviso oficial',forecastValid:'Previsão válida',hours:'horas',officialPagasaBulletin:'Boletim oficial PAGASA',officialPagasaForecast:'Previsão oficial PAGASA',pagasaOutlook:'Previsão PAGASA',severeWeatherWarning:'Aviso de tempo severo',upcomingSevereWeather:'Tempo severo próximo' },
  ja:{ routeMap:'ルートマップ',weatherTrack:'気象トラック',expandMap:'地図を拡大',exitFullscreen:'全画面を終了',driving:'車',transit:'公共交通',walk:'徒歩',cycling:'自転車',flights:'航空',closeDirections:'経路を閉じる',chooseStartingPoint:'出発地点または場所を選択…',searchDestination:'場所、モール、ホテル、住所を検索…',findingRoute:'最適なリアルタイム経路を検索中…',start:'開始',stop:'停止',steps:'手順',hide:'非表示',searchPlaces:'場所、道路、ランドマークを検索…',directions:'経路',routeMapType:'地図タイプ',showYourLocation:'現在地を表示',zoomIn:'拡大',zoomOut:'縮小',cycloneBulletin:'サイクロン速報',feedUnavailable:'フィード利用不可',loading:'読み込み中…',chooseCyclone:'地図でサイクロンを選択',rainRadar:'雨雲レーダー',forecastTracks:'予報進路',uncertaintyCircles:'JMA不確実性円',source:'情報源',issued:'発表',positionTime:'位置時刻',officialAdvisory:'公式情報',forecastValid:'予報有効',hours:'時間',officialPagasaBulletin:'PAGASA公式速報',officialPagasaForecast:'PAGASA公式予報',pagasaOutlook:'PAGASA見通し',severeWeatherWarning:'悪天候警報',upcomingSevereWeather:'今後の悪天候' },
  ko:{ routeMap:'경로 지도',weatherTrack:'날씨 추적',expandMap:'지도 확대',exitFullscreen:'전체 화면 종료',driving:'자동차',transit:'대중교통',walk:'도보',cycling:'자전거',flights:'항공',closeDirections:'길찾기 닫기',chooseStartingPoint:'출발지 또는 장소 선택…',searchDestination:'장소, 쇼핑몰, 호텔, 주소 검색…',findingRoute:'최적의 실시간 경로 검색 중…',start:'시작',stop:'중지',steps:'단계',hide:'숨기기',searchPlaces:'장소, 도로, 랜드마크 검색…',directions:'길찾기',routeMapType:'지도 유형',showYourLocation:'내 위치 표시',zoomIn:'확대',zoomOut:'축소',cycloneBulletin:'사이클론 공보',feedUnavailable:'피드 사용 불가',loading:'로딩 중…',chooseCyclone:'지도에서 사이클론 선택',rainRadar:'강우 레이더',forecastTracks:'예보 경로',uncertaintyCircles:'JMA 불확실성 원',source:'출처',issued:'발표',positionTime:'위치 시각',officialAdvisory:'공식 공보',forecastValid:'예보 유효',hours:'시간',officialPagasaBulletin:'PAGASA 공식 공보',officialPagasaForecast:'PAGASA 공식 예보',pagasaOutlook:'PAGASA 전망',severeWeatherWarning:'악천후 경보',upcomingSevereWeather:'예정된 악천후' },
  zh:{ routeMap:'路线地图',weatherTrack:'天气追踪',expandMap:'展开地图',exitFullscreen:'退出全屏',driving:'驾车',transit:'公交',walk:'步行',cycling:'骑行',flights:'航班',closeDirections:'关闭路线',chooseStartingPoint:'选择起点或地点…',searchDestination:'搜索地点、商场、酒店、地址…',findingRoute:'正在寻找最佳实时路线…',start:'开始',stop:'停止',steps:'步骤',hide:'隐藏',searchPlaces:'搜索地点、道路、地标…',directions:'路线',routeMapType:'地图类型',showYourLocation:'显示你的位置',zoomIn:'放大',zoomOut:'缩小',cycloneBulletin:'气旋通报',feedUnavailable:'数据源不可用',loading:'加载中…',chooseCyclone:'选择要在地图上定位的气旋',rainRadar:'降雨雷达',forecastTracks:'预报路径',uncertaintyCircles:'JMA 不确定性圆',source:'来源',issued:'发布',positionTime:'位置时间',officialAdvisory:'官方通报',forecastValid:'预报有效',hours:'小时',officialPagasaBulletin:'PAGASA 官方通报',officialPagasaForecast:'PAGASA 官方预报',pagasaOutlook:'PAGASA 展望',severeWeatherWarning:'恶劣天气警告',upcomingSevereWeather:'即将到来的恶劣天气' },
  hi:{ routeMap:'मार्ग मानचित्र',weatherTrack:'मौसम ट्रैक',expandMap:'मानचित्र बड़ा करें',exitFullscreen:'पूर्ण स्क्रीन से बाहर',driving:'ड्राइविंग',transit:'ट्रांज़िट',walk:'पैदल',cycling:'साइकिल',flights:'उड़ान',closeDirections:'दिशाएँ बंद करें',chooseStartingPoint:'शुरुआती स्थान चुनें…',searchDestination:'स्थान, मॉल, होटल, पता खोजें…',findingRoute:'सबसे अच्छा लाइव मार्ग खोजा जा रहा है…',start:'शुरू',stop:'रोकें',steps:'चरण',hide:'छिपाएँ',searchPlaces:'स्थान, सड़कें, लैंडमार्क खोजें…',directions:'दिशाएँ',routeMapType:'मानचित्र प्रकार',showYourLocation:'अपना स्थान दिखाएँ',zoomIn:'ज़ूम इन',zoomOut:'ज़ूम आउट',cycloneBulletin:'चक्रवात बुलेटिन',feedUnavailable:'फ़ीड उपलब्ध नहीं',loading:'लोड हो रहा है…',chooseCyclone:'मानचित्र पर चक्रवात चुनें',rainRadar:'वर्षा रडार',forecastTracks:'पूर्वानुमान पथ',uncertaintyCircles:'JMA अनिश्चितता वृत्त',source:'स्रोत',issued:'जारी',positionTime:'स्थिति समय',officialAdvisory:'आधिकारिक परामर्श',forecastValid:'पूर्वानुमान मान्य',hours:'घंटे',officialPagasaBulletin:'आधिकारिक PAGASA बुलेटिन',officialPagasaForecast:'आधिकारिक PAGASA पूर्वानुमान',pagasaOutlook:'PAGASA पूर्वानुमान',severeWeatherWarning:'गंभीर मौसम चेतावनी',upcomingSevereWeather:'आगामी गंभीर मौसम' },
  ru:{ routeMap:'Карта маршрутов',weatherTrack:'Отслеживание погоды',expandMap:'Развернуть карту',exitFullscreen:'Выйти из полноэкранного режима',driving:'Авто',transit:'Транспорт',walk:'Пешком',cycling:'Велосипед',flights:'Полёты',closeDirections:'Закрыть маршрут',chooseStartingPoint:'Выберите точку отправления или место…',searchDestination:'Поиск места, ТЦ, отеля или адреса…',findingRoute:'Поиск лучшего маршрута в реальном времени…',start:'Старт',stop:'Стоп',steps:'Шаги',hide:'Скрыть',searchPlaces:'Поиск мест, дорог и ориентиров…',directions:'Маршрут',routeMapType:'Тип карты',showYourLocation:'Показать ваше местоположение',zoomIn:'Приблизить',zoomOut:'Отдалить',cycloneBulletin:'Бюллетень по циклонам',feedUnavailable:'данные недоступны',loading:'загрузка…',chooseCyclone:'Выберите циклон на карте',rainRadar:'Радар осадков',forecastTracks:'Прогнозные траектории',uncertaintyCircles:'Круги неопределённости JMA',source:'Источник',issued:'Выпущено',positionTime:'Время позиции',officialAdvisory:'Официальное сообщение',forecastValid:'Прогноз действителен',hours:'часов',officialPagasaBulletin:'Официальный бюллетень PAGASA',officialPagasaForecast:'Официальный прогноз PAGASA',pagasaOutlook:'Прогноз PAGASA',severeWeatherWarning:'Предупреждение об опасной погоде',upcomingSevereWeather:'Ожидается опасная погода' },
  ar:{ routeMap:'خريطة المسار',weatherTrack:'تتبع الطقس',expandMap:'توسيع الخريطة',exitFullscreen:'الخروج من ملء الشاشة',driving:'قيادة',transit:'نقل عام',walk:'مشي',cycling:'دراجة',flights:'رحلات',closeDirections:'إغلاق الاتجاهات',chooseStartingPoint:'اختر نقطة البداية أو مكانًا…',searchDestination:'ابحث عن مكان أو مركز أو فندق أو عنوان…',findingRoute:'جارٍ البحث عن أفضل مسار مباشر…',start:'بدء',stop:'إيقاف',steps:'الخطوات',hide:'إخفاء',searchPlaces:'ابحث عن أماكن وطرق ومعالم…',directions:'الاتجاهات',routeMapType:'نوع الخريطة',showYourLocation:'إظهار موقعك',zoomIn:'تكبير',zoomOut:'تصغير',cycloneBulletin:'نشرة الأعاصير',feedUnavailable:'المصدر غير متاح',loading:'جارٍ التحميل…',chooseCyclone:'اختر إعصارًا لتحديده على الخريطة',rainRadar:'رادار المطر',forecastTracks:'مسارات التوقع',uncertaintyCircles:'دوائر عدم اليقين JMA',source:'المصدر',issued:'صادر',positionTime:'وقت الموقع',officialAdvisory:'النشرة الرسمية',forecastValid:'التوقع صالح',hours:'ساعات',officialPagasaBulletin:'نشرة PAGASA الرسمية',officialPagasaForecast:'توقع PAGASA الرسمي',pagasaOutlook:'توقعات PAGASA',severeWeatherWarning:'تحذير من طقس شديد',upcomingSevereWeather:'طقس شديد قادم' },
};

export function getMapUiLabels(language: string = 'en'): MapUiLabels {
  const code = languageAlias[language] || language;
  return { ...mapEn, ...(mapOverrides[code] || {}) };
}


const PAGASA_OUTLOOK_TEXT: Record<string, Record<string, string>> = {
  es: {
    'Cloudy skies with scattered rains and thunderstorms': 'Cielos nublados con lluvias dispersas y tormentas eléctricas',
    'Partly cloudy to cloudy skies with isolated rainshowers or thunderstorms': 'Cielos parcialmente nublados a nublados con lluvias o tormentas aisladas',
    'Cloudy skies with rains and thunderstorms': 'Cielos nublados con lluvias y tormentas eléctricas',
    'Mostly cloudy skies with scattered rains and thunderstorms': 'Cielos mayormente nublados con lluvias dispersas y tormentas eléctricas',
  },
  fr: {
    'Cloudy skies with scattered rains and thunderstorms': 'Ciel nuageux avec pluies éparses et orages',
    'Partly cloudy to cloudy skies with isolated rainshowers or thunderstorms': 'Ciel partiellement nuageux à nuageux avec averses ou orages isolés',
    'Cloudy skies with rains and thunderstorms': 'Ciel nuageux avec pluies et orages',
    'Mostly cloudy skies with scattered rains and thunderstorms': 'Ciel généralement nuageux avec pluies éparses et orages',
  },
  de: {
    'Cloudy skies with scattered rains and thunderstorms': 'Bewölkter Himmel mit vereinzelten Regenfällen und Gewittern',
    'Partly cloudy to cloudy skies with isolated rainshowers or thunderstorms': 'Teilweise bewölkt bis bewölkt mit einzelnen Regenschauern oder Gewittern',
    'Cloudy skies with rains and thunderstorms': 'Bewölkter Himmel mit Regen und Gewittern',
    'Mostly cloudy skies with scattered rains and thunderstorms': 'Überwiegend bewölkt mit vereinzeltem Regen und Gewittern',
  },
  it: {
    'Cloudy skies with scattered rains and thunderstorms': 'Cielo nuvoloso con piogge sparse e temporali',
    'Partly cloudy to cloudy skies with isolated rainshowers or thunderstorms': 'Cielo da parzialmente nuvoloso a nuvoloso con rovesci o temporali isolati',
    'Cloudy skies with rains and thunderstorms': 'Cielo nuvoloso con piogge e temporali',
    'Mostly cloudy skies with scattered rains and thunderstorms': 'Cielo prevalentemente nuvoloso con piogge sparse e temporali',
  },
  pt: {
    'Cloudy skies with scattered rains and thunderstorms': 'Céu nublado com chuvas dispersas e trovoadas',
    'Partly cloudy to cloudy skies with isolated rainshowers or thunderstorms': 'Céu parcialmente nublado a nublado com pancadas de chuva ou trovoadas isoladas',
    'Cloudy skies with rains and thunderstorms': 'Céu nublado com chuvas e trovoadas',
    'Mostly cloudy skies with scattered rains and thunderstorms': 'Céu predominantemente nublado com chuvas dispersas e trovoadas',
  },
  ja: {
    'Cloudy skies with scattered rains and thunderstorms': '曇りで、所により雨や雷雨',
    'Partly cloudy to cloudy skies with isolated rainshowers or thunderstorms': '晴れ間のある曇りから曇りで、所によりにわか雨または雷雨',
    'Cloudy skies with rains and thunderstorms': '曇りで雨や雷雨',
    'Mostly cloudy skies with scattered rains and thunderstorms': '概ね曇りで、所により雨や雷雨',
  },
  ko: {
    'Cloudy skies with scattered rains and thunderstorms': '흐리고 곳에 따라 비와 뇌우',
    'Partly cloudy to cloudy skies with isolated rainshowers or thunderstorms': '구름 많음에서 흐림, 곳에 따라 소나기 또는 뇌우',
    'Cloudy skies with rains and thunderstorms': '흐리고 비와 뇌우',
    'Mostly cloudy skies with scattered rains and thunderstorms': '대체로 흐리고 곳에 따라 비와 뇌우',
  },
  zh: {
    'Cloudy skies with scattered rains and thunderstorms': '多云，有分散性降雨和雷暴',
    'Partly cloudy to cloudy skies with isolated rainshowers or thunderstorms': '局部多云至多云，有局部阵雨或雷暴',
    'Cloudy skies with rains and thunderstorms': '多云，有降雨和雷暴',
    'Mostly cloudy skies with scattered rains and thunderstorms': '大部多云，有分散性降雨和雷暴',
  },
  hi: {
    'Cloudy skies with scattered rains and thunderstorms': 'बादल छाए रहेंगे, कहीं-कहीं बारिश और गरज-चमक होगी',
    'Partly cloudy to cloudy skies with isolated rainshowers or thunderstorms': 'आंशिक बादल से बादल छाए रहेंगे, कहीं-कहीं वर्षा या गरज-चमक होगी',
    'Cloudy skies with rains and thunderstorms': 'बादल छाए रहेंगे, बारिश और गरज-चमक होगी',
    'Mostly cloudy skies with scattered rains and thunderstorms': 'अधिकतर बादल छाए रहेंगे, कहीं-कहीं बारिश और गरज-चमक होगी',
  },
  ru: {
    'Cloudy skies with scattered rains and thunderstorms': 'Облачно, местами дожди и грозы',
    'Partly cloudy to cloudy skies with isolated rainshowers or thunderstorms': 'Переменная облачность до облачности, местами кратковременные дожди или грозы',
    'Cloudy skies with rains and thunderstorms': 'Облачно, дожди и грозы',
    'Mostly cloudy skies with scattered rains and thunderstorms': 'Преимущественно облачно, местами дожди и грозы',
  },
  ar: {
    'Cloudy skies with scattered rains and thunderstorms': 'سماء غائمة مع أمطار متفرقة وعواصف رعدية',
    'Partly cloudy to cloudy skies with isolated rainshowers or thunderstorms': 'سماء غائمة جزئيًا إلى غائمة مع زخات أو عواصف رعدية متفرقة',
    'Cloudy skies with rains and thunderstorms': 'سماء غائمة مع أمطار وعواصف رعدية',
    'Mostly cloudy skies with scattered rains and thunderstorms': 'سماء غائمة غالبًا مع أمطار متفرقة وعواصف رعدية',
  },
};

export function translatePagasaOutlookText(text: string, language: string = 'en') {
  if (!text) return text;

  const code = languageAlias[language] || language;
  const raw = text.trim().replace(/\s+/g, ' ');
  if (code === 'en') return raw;

  type OutlookParts = {
    condition: string;
    cause?: string;
    area?: string;
    impact?: string;
  };

  const conditionKey =
    /partly cloudy to cloudy skies with isolated rain\s*showers? or thunderstorms?/i.test(raw) ? 'isolated' :
    /mostly cloudy skies with scattered rains? and thunderstorms?/i.test(raw) ? 'mostlyScattered' :
    /cloudy skies with scattered rains? and thunderstorms?/i.test(raw) ? 'scattered' :
    /cloudy skies with rains? and thunderstorms?/i.test(raw) ? 'rainThunder' :
    /moderate to (?:at times )?heavy rains?/i.test(raw) ? 'heavyRain' :
    /intense rains?|heavy rains?/i.test(raw) ? 'heavyRain' :
    /thunderstorms?/i.test(raw) ? 'thunderstorm' :
    /cloudy skies/i.test(raw) ? 'cloudy' :
    'severeWeather';

  const causeKey =
    /southwest monsoon/i.test(raw) ? 'southwestMonsoon' :
    /northeast monsoon/i.test(raw) ? 'northeastMonsoon' :
    /\beasterlies\b/i.test(raw) ? 'easterlies' :
    /shear line/i.test(raw) ? 'shearLine' :
    /intertropical convergence zone|\bITCZ\b/i.test(raw) ? 'itcz' :
    /trough of (?:a |the )?low pressure area/i.test(raw) ? 'lpaTrough' :
    /low pressure area|\bLPA\b/i.test(raw) ? 'lpa' :
    /localized thunderstorms?/i.test(raw) ? 'localizedThunderstorms' :
    '';

  const impactKey =
    /flash floods?.*landslides?|landslides?.*flash floods?/i.test(raw) ? 'floodLandslide' :
    /flash floods?/i.test(raw) ? 'flashFlood' :
    /landslides?/i.test(raw) ? 'landslide' :
    '';

  // Keep geographic proper names, but remove English forecast/cause/impact clauses
  // from the extracted area so the displayed sentence cannot remain mixed-language.
  let area = '';
  const overMatch = raw.match(/\bover\s+(.+?)(?=\s+(?:due to|caused by|because of|with possible|resulting in|which may cause)\b|[.;]|$)/i);
  if (overMatch?.[1]) {
    area = overMatch[1]
      .replace(/\bSouthwest Monsoon\b/gi, '')
      .replace(/\bNortheast Monsoon\b/gi, '')
      .replace(/\bEasterlies\b/gi, '')
      .replace(/\bShear Line\b/gi, '')
      .replace(/\bIntertropical Convergence Zone\b/gi, '')
      .replace(/\bITCZ\b/gi, '')
      .replace(/\bLow Pressure Area\b/gi, '')
      .replace(/\bLPA\b/g, '')
      .replace(/^[\s,;:-]+|[\s,;:-]+$/g, '')
      .trim();
  }

  const words: Record<string, {
    conditions: Record<string, string>;
    causes: Record<string, string>;
    impacts: Record<string, string>;
    restOf: string;
    and: string;
    including: string;
  }> = {
    es: {
      conditions: {
        isolated: 'Cielos parcialmente nublados a nublados con lluvias aisladas o tormentas eléctricas',
        mostlyScattered: 'Cielos mayormente nublados con lluvias dispersas y tormentas eléctricas',
        scattered: 'Cielos nublados con lluvias dispersas y tormentas eléctricas',
        rainThunder: 'Cielos nublados con lluvias y tormentas eléctricas',
        heavyRain: 'Se esperan lluvias moderadas a fuertes',
        thunderstorm: 'Se esperan tormentas eléctricas',
        cloudy: 'Se esperan cielos nublados',
        severeWeather: 'Se esperan condiciones meteorológicas adversas',
      },
      causes: {
        southwestMonsoon: 'el monzón del suroeste', northeastMonsoon: 'el monzón del noreste',
        easterlies: 'los vientos del este', shearLine: 'la línea de cizalladura',
        itcz: 'la Zona de Convergencia Intertropical', lpaTrough: 'la vaguada de un área de baja presión',
        lpa: 'un área de baja presión', localizedThunderstorms: 'tormentas eléctricas localizadas',
      },
      impacts: {
        floodLandslide: 'Existe posibilidad de inundaciones repentinas o deslizamientos de tierra.',
        flashFlood: 'Existe posibilidad de inundaciones repentinas.',
        landslide: 'Existe posibilidad de deslizamientos de tierra.',
      },
      restOf: 'el resto de', and: 'y', including: 'incluido',
    },
    fr: {
      conditions: {
        isolated: 'Ciel partiellement nuageux à nuageux avec averses ou orages isolés',
        mostlyScattered: 'Ciel généralement nuageux avec pluies éparses et orages',
        scattered: 'Ciel nuageux avec pluies éparses et orages',
        rainThunder: 'Ciel nuageux avec pluies et orages',
        heavyRain: 'Des pluies modérées à fortes sont attendues',
        thunderstorm: 'Des orages sont attendus',
        cloudy: 'Un ciel nuageux est attendu',
        severeWeather: 'Des conditions météorologiques défavorables sont attendues',
      },
      causes: {
        southwestMonsoon: 'la mousson du sud-ouest', northeastMonsoon: 'la mousson du nord-est',
        easterlies: 'les vents d’est', shearLine: 'la ligne de cisaillement',
        itcz: 'la zone de convergence intertropicale', lpaTrough: 'le creux d’une zone de basse pression',
        lpa: 'une zone de basse pression', localizedThunderstorms: 'des orages localisés',
      },
      impacts: {
        floodLandslide: 'Des crues soudaines ou des glissements de terrain sont possibles.',
        flashFlood: 'Des crues soudaines sont possibles.',
        landslide: 'Des glissements de terrain sont possibles.',
      },
      restOf: 'le reste de', and: 'et', including: 'y compris',
    },
    de: {
      conditions: {
        isolated: 'Teilweise bewölkter bis bewölkter Himmel mit einzelnen Regenschauern oder Gewittern',
        mostlyScattered: 'Überwiegend bewölkter Himmel mit vereinzeltem Regen und Gewittern',
        scattered: 'Bewölkter Himmel mit vereinzeltem Regen und Gewittern',
        rainThunder: 'Bewölkter Himmel mit Regen und Gewittern',
        heavyRain: 'Mäßiger bis starker Regen wird erwartet',
        thunderstorm: 'Gewitter werden erwartet',
        cloudy: 'Bewölkter Himmel wird erwartet',
        severeWeather: 'Ungünstige Wetterbedingungen werden erwartet',
      },
      causes: {
        southwestMonsoon: 'den Südwestmonsun', northeastMonsoon: 'den Nordostmonsun',
        easterlies: 'Ostwinde', shearLine: 'die Scherlinie',
        itcz: 'die Innertropische Konvergenzzone', lpaTrough: 'den Trog eines Tiefdruckgebiets',
        lpa: 'ein Tiefdruckgebiet', localizedThunderstorms: 'lokale Gewitter',
      },
      impacts: {
        floodLandslide: 'Sturzfluten oder Erdrutsche sind möglich.',
        flashFlood: 'Sturzfluten sind möglich.',
        landslide: 'Erdrutsche sind möglich.',
      },
      restOf: 'der Rest von', and: 'und', including: 'einschließlich',
    },
    it: {
      conditions: {
        isolated: 'Cielo da parzialmente nuvoloso a nuvoloso con rovesci o temporali isolati',
        mostlyScattered: 'Cielo prevalentemente nuvoloso con piogge sparse e temporali',
        scattered: 'Cielo nuvoloso con piogge sparse e temporali',
        rainThunder: 'Cielo nuvoloso con piogge e temporali',
        heavyRain: 'Sono previste piogge da moderate a intense',
        thunderstorm: 'Sono previsti temporali',
        cloudy: 'È previsto cielo nuvoloso',
        severeWeather: 'Sono previste condizioni meteorologiche avverse',
      },
      causes: {
        southwestMonsoon: 'il monsone di sud-ovest', northeastMonsoon: 'il monsone di nord-est',
        easterlies: 'i venti orientali', shearLine: 'la linea di convergenza',
        itcz: 'la Zona di Convergenza Intertropicale', lpaTrough: 'la saccatura di un’area di bassa pressione',
        lpa: 'un’area di bassa pressione', localizedThunderstorms: 'temporali localizzati',
      },
      impacts: {
        floodLandslide: 'Sono possibili alluvioni improvvise o frane.',
        flashFlood: 'Sono possibili alluvioni improvvise.',
        landslide: 'Sono possibili frane.',
      },
      restOf: 'il resto di', and: 'e', including: 'compreso',
    },
    pt: {
      conditions: {
        isolated: 'Céu parcialmente nublado a nublado com pancadas de chuva ou trovoadas isoladas',
        mostlyScattered: 'Céu predominantemente nublado com chuvas dispersas e trovoadas',
        scattered: 'Céu nublado com chuvas dispersas e trovoadas',
        rainThunder: 'Céu nublado com chuvas e trovoadas',
        heavyRain: 'São esperadas chuvas moderadas a fortes',
        thunderstorm: 'São esperadas trovoadas',
        cloudy: 'É esperado céu nublado',
        severeWeather: 'São esperadas condições meteorológicas adversas',
      },
      causes: {
        southwestMonsoon: 'a monção de sudoeste', northeastMonsoon: 'a monção de nordeste',
        easterlies: 'os ventos de leste', shearLine: 'a linha de cisalhamento',
        itcz: 'a Zona de Convergência Intertropical', lpaTrough: 'o cavado de uma área de baixa pressão',
        lpa: 'uma área de baixa pressão', localizedThunderstorms: 'trovoadas localizadas',
      },
      impacts: {
        floodLandslide: 'Há possibilidade de inundações repentinas ou deslizamentos.',
        flashFlood: 'Há possibilidade de inundações repentinas.',
        landslide: 'Há possibilidade de deslizamentos.',
      },
      restOf: 'o restante de', and: 'e', including: 'incluindo',
    },
    ja: {
      conditions: {
        isolated: '晴れ間のある曇りから曇りで、所によりにわか雨または雷雨となる見込みです',
        mostlyScattered: '概ね曇りで、所により雨や雷雨となる見込みです',
        scattered: '曇りで、所により雨や雷雨となる見込みです',
        rainThunder: '曇りで、雨や雷雨となる見込みです',
        heavyRain: '中程度から強い雨が予想されます',
        thunderstorm: '雷雨が予想されます',
        cloudy: '曇り空が予想されます',
        severeWeather: '悪天候が予想されます',
      },
      causes: {
        southwestMonsoon: '南西モンスーン', northeastMonsoon: '北東モンスーン',
        easterlies: '偏東風', shearLine: 'シアーライン',
        itcz: '熱帯収束帯', lpaTrough: '低圧部の谷',
        lpa: '低圧部', localizedThunderstorms: '局地的な雷雨',
      },
      impacts: {
        floodLandslide: '急な洪水や土砂災害のおそれがあります。',
        flashFlood: '急な洪水のおそれがあります。',
        landslide: '土砂災害のおそれがあります。',
      },
      restOf: 'その他の', and: 'および', including: 'を含む',
    },
    ko: {
      conditions: {
        isolated: '구름이 많거나 흐리고 곳에 따라 소나기 또는 뇌우가 예상됩니다',
        mostlyScattered: '대체로 흐리고 곳에 따라 비와 뇌우가 예상됩니다',
        scattered: '흐리고 곳에 따라 비와 뇌우가 예상됩니다',
        rainThunder: '흐리고 비와 뇌우가 예상됩니다',
        heavyRain: '보통에서 강한 비가 예상됩니다',
        thunderstorm: '뇌우가 예상됩니다',
        cloudy: '흐린 하늘이 예상됩니다',
        severeWeather: '악천후가 예상됩니다',
      },
      causes: {
        southwestMonsoon: '남서 계절풍', northeastMonsoon: '북동 계절풍',
        easterlies: '동풍', shearLine: '시어 라인',
        itcz: '열대수렴대', lpaTrough: '저기압성 요란의 기압골',
        lpa: '저기압성 요란', localizedThunderstorms: '국지성 뇌우',
      },
      impacts: {
        floodLandslide: '돌발 홍수 또는 산사태가 발생할 수 있습니다.',
        flashFlood: '돌발 홍수가 발생할 수 있습니다.',
        landslide: '산사태가 발생할 수 있습니다.',
      },
      restOf: '나머지', and: '및', including: '포함',
    },
    zh: {
      conditions: {
        isolated: '局部多云至多云，有局部阵雨或雷暴',
        mostlyScattered: '大部多云，有分散性降雨和雷暴',
        scattered: '多云，有分散性降雨和雷暴',
        rainThunder: '多云，有降雨和雷暴',
        heavyRain: '预计有中等至强降雨',
        thunderstorm: '预计有雷暴',
        cloudy: '预计多云',
        severeWeather: '预计出现恶劣天气',
      },
      causes: {
        southwestMonsoon: '西南季风', northeastMonsoon: '东北季风',
        easterlies: '偏东风', shearLine: '切变线',
        itcz: '热带辐合带', lpaTrough: '低压区槽',
        lpa: '低压区', localizedThunderstorms: '局地雷暴',
      },
      impacts: {
        floodLandslide: '可能发生山洪或山体滑坡。',
        flashFlood: '可能发生山洪。',
        landslide: '可能发生山体滑坡。',
      },
      restOf: '其余', and: '和', including: '包括',
    },
    hi: {
      conditions: {
        isolated: 'आंशिक बादल से बादल छाए रहेंगे और कहीं-कहीं वर्षा या गरज-चमक की संभावना है',
        mostlyScattered: 'अधिकतर बादल छाए रहेंगे और कहीं-कहीं बारिश व गरज-चमक की संभावना है',
        scattered: 'बादल छाए रहेंगे और कहीं-कहीं बारिश व गरज-चमक की संभावना है',
        rainThunder: 'बादल छाए रहेंगे और बारिश व गरज-चमक की संभावना है',
        heavyRain: 'मध्यम से भारी बारिश की संभावना है',
        thunderstorm: 'गरज-चमक की संभावना है',
        cloudy: 'बादल छाए रहने की संभावना है',
        severeWeather: 'प्रतिकूल मौसम की संभावना है',
      },
      causes: {
        southwestMonsoon: 'दक्षिण-पश्चिम मानसून', northeastMonsoon: 'उत्तर-पूर्व मानसून',
        easterlies: 'पूर्वी हवाओं', shearLine: 'शियर लाइन',
        itcz: 'अंतर-उष्णकटिबंधीय अभिसरण क्षेत्र', lpaTrough: 'निम्न दबाव क्षेत्र की द्रोणी',
        lpa: 'निम्न दबाव क्षेत्र', localizedThunderstorms: 'स्थानीय गरज-चमक',
      },
      impacts: {
        floodLandslide: 'अचानक बाढ़ या भूस्खलन की संभावना है।',
        flashFlood: 'अचानक बाढ़ की संभावना है।',
        landslide: 'भूस्खलन की संभावना है।',
      },
      restOf: 'शेष', and: 'और', including: 'सहित',
    },
    ru: {
      conditions: {
        isolated: 'Переменная облачность до облачности, местами кратковременные дожди или грозы',
        mostlyScattered: 'Преимущественно облачно, местами дожди и грозы',
        scattered: 'Облачно, местами дожди и грозы',
        rainThunder: 'Облачно, дожди и грозы',
        heavyRain: 'Ожидаются умеренные и сильные дожди',
        thunderstorm: 'Ожидаются грозы',
        cloudy: 'Ожидается облачная погода',
        severeWeather: 'Ожидаются неблагоприятные погодные условия',
      },
      causes: {
        southwestMonsoon: 'юго-западного муссона', northeastMonsoon: 'северо-восточного муссона',
        easterlies: 'восточных ветров', shearLine: 'линии сдвига',
        itcz: 'Внутритропической зоны конвергенции', lpaTrough: 'ложбины области низкого давления',
        lpa: 'области низкого давления', localizedThunderstorms: 'локальных гроз',
      },
      impacts: {
        floodLandslide: 'Возможны внезапные паводки или оползни.',
        flashFlood: 'Возможны внезапные паводки.',
        landslide: 'Возможны оползни.',
      },
      restOf: 'остальная часть', and: 'и', including: 'включая',
    },
    ar: {
      conditions: {
        isolated: 'سماء غائمة جزئيًا إلى غائمة مع زخات أو عواصف رعدية متفرقة',
        mostlyScattered: 'سماء غائمة غالبًا مع أمطار متفرقة وعواصف رعدية',
        scattered: 'سماء غائمة مع أمطار متفرقة وعواصف رعدية',
        rainThunder: 'سماء غائمة مع أمطار وعواصف رعدية',
        heavyRain: 'من المتوقع هطول أمطار متوسطة إلى غزيرة',
        thunderstorm: 'من المتوقع حدوث عواصف رعدية',
        cloudy: 'من المتوقع أن تكون السماء غائمة',
        severeWeather: 'من المتوقع حدوث أحوال جوية سيئة',
      },
      causes: {
        southwestMonsoon: 'الرياح الموسمية الجنوبية الغربية', northeastMonsoon: 'الرياح الموسمية الشمالية الشرقية',
        easterlies: 'الرياح الشرقية', shearLine: 'خط القص',
        itcz: 'منطقة التقارب بين المدارين', lpaTrough: 'أخدود منطقة ضغط منخفض',
        lpa: 'منطقة ضغط منخفض', localizedThunderstorms: 'عواصف رعدية محلية',
      },
      impacts: {
        floodLandslide: 'قد تحدث فيضانات مفاجئة أو انهيارات أرضية.',
        flashFlood: 'قد تحدث فيضانات مفاجئة.',
        landslide: 'قد تحدث انهيارات أرضية.',
      },
      restOf: 'بقية', and: 'و', including: 'بما في ذلك',
    },
  };

  const lang = words[code];
  if (!lang) return raw;

  if (area) {
    area = area
      .replace(/\band the rest of\b/gi, ` ${lang.and} ${lang.restOf} `)
      .replace(/\bthe rest of\b/gi, lang.restOf)
      .replace(/\bincluding\b/gi, lang.including)
      .replace(/\band\b/gi, ` ${lang.and} `)
      .replace(/\s+/g, ' ')
      .trim();
  }

  const condition = lang.conditions[conditionKey] || lang.conditions.severeWeather;
  const cause = causeKey ? lang.causes[causeKey] : '';
  const impact = impactKey ? lang.impacts[impactKey] : '';

  let sentence = '';
  if (code === 'ja') {
    sentence = `${area ? `${area}では、` : ''}${cause ? `${cause}の影響により、` : ''}${condition}。`;
  } else if (code === 'ko') {
    sentence = `${area ? `${area}에는 ` : ''}${cause ? `${cause}의 영향으로 ` : ''}${condition}.`;
  } else if (code === 'zh') {
    sentence = `${area ? `${area}：` : ''}${cause ? `受${cause}影响，` : ''}${condition}。`;
  } else if (code === 'hi') {
    sentence = `${area ? `${area} में ` : ''}${cause ? `${cause} के कारण ` : ''}${condition}।`;
  } else if (code === 'ar') {
    sentence = `${area ? `في ${area}، ` : ''}${cause ? `بسبب ${cause}، ` : ''}${condition}.`;
  } else if (code === 'ru') {
    sentence = `${area ? `В районе ${area} ` : ''}${condition}${cause ? ` из-за ${cause}` : ''}.`;
  } else if (code === 'de') {
    sentence = `${area ? `Für ${area} ` : ''}${condition}${cause ? ` aufgrund von ${cause}` : ''}.`;
  } else if (code === 'fr') {
    sentence = `${area ? `Sur ${area}, ` : ''}${condition}${cause ? ` en raison de ${cause}` : ''}.`;
  } else if (code === 'es') {
    sentence = `${area ? `En ${area}, ` : ''}${condition}${cause ? ` debido a ${cause}` : ''}.`;
  } else if (code === 'it') {
    sentence = `${area ? `Su ${area}, ` : ''}${condition}${cause ? ` a causa di ${cause}` : ''}.`;
  } else if (code === 'pt') {
    sentence = `${area ? `Em ${area}, ` : ''}${condition}${cause ? ` devido a ${cause}` : ''}.`;
  } else {
    sentence = condition;
  }

  return `${sentence}${impact ? ` ${impact}` : ''}`.trim();
}
