"""
Tier 1 Instant (0ms) Multilingual Heuristic Regex Shortcuts Resolver.
"""

from __future__ import annotations

import re

from seyal_ai.agents.computer_use.protocol import ActionType, ComputerAction
from seyal_ai.utils.logging import get_logger

from .catalog import (
    CANONICAL_SHORTCUTS,
    COMPOUND_DELIMITERS,
    EXPLICIT_MOUSE_PATTERNS,
)

log = get_logger("agents.computer_use.shortcuts.heuristic")

# Fast multi-lingual regex cache for Tier 1 0ms matching
FAST_CACHE: list[tuple[re.Pattern[str], str]] = [
    # Start Menu
    (re.compile(r"(start\s*menu|open\s*start|start\s*open|மெனு\s*திற)", re.I), "win"),
    # Select all: English, Tanglish, Tamil, Hindi, French, Spanish
    (re.compile(r"(select\s*all|full\s*select|ellathaiyum\s*select|sara\s*select|sab\s*kuch\s*select|அனைத்தையும்\s*தேர்ந்தெடு|tout\s*sélectionner|seleccionar\s*todo)", re.I), "ctrl+a"),
    # New Tab
    (re.compile(r"(new\s*tab|open\s*tab|tab\s*open|puthu\s*tab|naya\s*tab|nouvel\s*onglet|nueva\s*pestaña|புதிய\s*தத்தல்)", re.I), "ctrl+t"),
    # Close Tab
    (re.compile(r"(close\s*tab|tab\s*close|tab\s*moodu|tab\s*band\s*karo|fermer\s*l'onglet|cerrar\s*pestaña|தத்தலை\s*மூடு)", re.I), "ctrl+w"),
    # Next / Previous Tab
    (re.compile(r"(next\s*tab|switch\s*tab|adutha\s*tab|agla\s*tab|onglet\s*suivant|siguiente\s*pestaña|அடுத்த\s*தத்தல்)", re.I), "ctrl+tab"),
    (re.compile(r"(previous\s*tab|prev\s*tab|munnadi\s*tab|pichla\s*tab|onglet\s*précédent|pestaña\s*anterior|முந்தைய\s*தத்தல்)", re.I), "ctrl+shift+tab"),
    # Move Tab Left / Right
    (re.compile(r"(move\s*tab\s*left|tab\s*left|idathu\s*pakkam\s*move\s*pannu)", re.I), "ctrl+shift+pageup"),
    (re.compile(r"(move\s*tab\s*right|tab\s*right|valathu\s*pakkam\s*move\s*pannu)", re.I), "ctrl+shift+pagedown"),
    # Focus Tab Navigation
    (re.compile(r"(shift\s*tab|previous\s*field|munnadi\s*field|back\s*field)", re.I), "shift+tab"),
    (re.compile(r"(^tab$|tab\s*(key|adi|press|pannu)|next\s*field|adutha\s*field|forward\s*field)", re.I), "tab"),
    # Reopen closed tab
    (re.compile(r"(reopen\s*closed\s*tab|restore\s*tab|moodiya\s*tab)", re.I), "ctrl+shift+t"),
    # Print / Save as PDF
    (re.compile(r"(print\s*page|print\s*document|save\s*as\s*pdf|print\s*pannu|imprimer|imprimir|அச்சிடு)", re.I), "ctrl+p"),
    # Save & Open
    (re.compile(r"(save\s*as|save\s*all|வேறு\s*பெயரில்\s*சேமி)", re.I), "ctrl+shift+s"),
    (re.compile(r"(\bsave\b|save\s*pannu|save\s*it|save\s*karo|sauvegarder|guardar|சேமி)", re.I), "ctrl+s"),
    (re.compile(r"(open\s*file|open\s*document|file\s*open\s*pannu|கோப்பைத்\s*திற)", re.I), "ctrl+o"),
    # Copy
    (re.compile(r"(\bcopy\b|copy\s*pannu|copy\s*it|copy\s*karo|copier|copiar|நகலெடு)", re.I), "ctrl+c"),
    # Paste
    (re.compile(r"(\bpaste\b|paste\s*pannu|paste\s*it|paste\s*karo|coller|pegar|ஒட்டு)", re.I), "ctrl+v"),
    (re.compile(r"(paste\s*plain\s*text|plain\s*text\s*paste|unformatted\s*paste)", re.I), "ctrl+shift+v"),
    # Undo / Redo
    (re.compile(r"(\bundo\b|undo\s*pannu|annuler|deshacer|செயல்தவிர்)", re.I), "ctrl+z"),
    (re.compile(r"(\bredo\b|redo\s*pannu|rétablir|rehacer|மீண்டும்\s*செய்)", re.I), "ctrl+y"),
    # Bold / Italic / Underline
    (re.compile(r"(make\s*bold|bold\s*text|bold\s*pannu|தடிமனாக்கு)", re.I), "ctrl+b"),
    (re.compile(r"(make\s*italic|italic\s*text|italic\s*pannu|சாய்வெழுத்து)", re.I), "ctrl+i"),
    (re.compile(r"(make\s*underline|underline\s*text|underline\s*pannu|அடிக்கோடிடு)", re.I), "ctrl+u"),
    (re.compile(r"(view\s*source|page\s*source|view\s*page\s*source|html\s*source)", re.I), "ctrl+u"),
    (re.compile(r"(increase\s*font\s*size|font\s*perusaaku|font\s*size\s*increase|பெரிய\s*எழுத்துரு)", re.I), "ctrl+shift+>"),
    (re.compile(r"(decrease\s*font\s*size|font\s*chinnathaaku|font\s*size\s*decrease|சிறிய\s*எழுத்துரு)", re.I), "ctrl+shift+<"),
    (re.compile(r"(double\s*line\s*spacing|double\s*spacing)", re.I), "ctrl+2"),
    (re.compile(r"(1\.5\s*line\s*spacing|one\s*and\s*half\s*spacing)", re.I), "ctrl+5"),
    # Delete / Word Delete / Permanent Delete
    (re.compile(r"(permanent\s*delete|permanently\s*delete|shift\s*delete|முழுமையாக\s*நீக்கு)", re.I), "shift+delete"),
    (re.compile(r"(delete\s*line|line\s*delete\s*pannu|remove\s*line|வரியை\s*நீக்கு)", re.I), "ctrl+shift+k"),
    (re.compile(r"(delete\s*word|delete\s*previous\s*word|oru\s*word\s*delete)", re.I), "ctrl+backspace"),
    (re.compile(r"(\bdelete\b|delete\s*pannu|delete\s*it|நீக்கு)", re.I), "delete"),
    # New Folder
    (re.compile(r"(new\s*folder|create\s*folder|puthu\s*folder|folder\s*create|naya\s*folder|nouveau\s*dossier|nueva\s*carpeta|புதிய\s*கோப்புறை)", re.I), "ctrl+shift+n"),
    # Rename
    (re.compile(r"(\brename\b|rename\s*pannu|pera\s*maathu|naam\s*badlo|renommer|renombrar|பெயர்\s*மாற்று)", re.I), "f2"),
    # Refresh / Hard Refresh
    (re.compile(r"(hard\s*reload|bypass\s*cache\s*reload|reload\s*without\s*cache)", re.I), "ctrl+shift+r"),
    (re.compile(r"(hard\s*refresh|force\s*reload|clear\s*cache\s*reload)", re.I), "ctrl+f5"),
    (re.compile(r"(refresh\s*page|reload\s*page|page\s*refresh|refresh\s*pannu|actualiser|recargar|புதுப்பி)", re.I), "ctrl+r"),
    # Window Maximize / Minimize / Snap
    (re.compile(r"(maximize\s*window|maximize\s*screen|maximize\s*pannu|perusaaku|perusu\s*pannu|agrandir\s*la\s*fenêtre|maximizar\s*ventana|பெரிதாக்கு)", re.I), "win+up"),
    (re.compile(r"(minimize\s*window|minimize\s*pannu|chinnathaaku|chota\s*karo|réduire\s*la\s*fenêtre|minimizar\s*ventana|சிறிதாக்கு)", re.I), "win+down"),
    (re.compile(r"(snap\s*left|left\s*snap|left\s*side\s*vai|bayen\s*snap|ajustar\s*a\s*la\s*izquierda|இடதுபுறம்\s*பொருத்து)", re.I), "win+left"),
    (re.compile(r"(snap\s*right|right\s*snap|right\s*side\s*vai|dayen\s*snap|ajustar\s*a\s*la\s*derecha|வலதுபுறம்\s*பொருத்து)", re.I), "win+right"),
    # Fullscreen
    (re.compile(r"(full\s*screen|toggle\s*fullscreen|muzhu\s*thirai|plein\s*écran|pantalla\s*completa|முழுத்திரை)", re.I), "f11"),
    # Virtual Desktops
    (re.compile(r"(new\s*virtual\s*desktop|create\s*desktop|puthu\s*desktop|naya\s*desktop|புதிய\s*மெய்நிகர்\s*டெஸ்க்டாப்)", re.I), "win+ctrl+d"),
    (re.compile(r"(next\s*desktop|switch\s*desktop|adutha\s*desktop|agla\s*desktop|அடுத்த\s*டெஸ்க்டாப்)", re.I), "win+ctrl+right"),
    (re.compile(r"(close\s*desktop|desktop\s*moodu|desktop\s*band\s*karo|டெஸ்க்டாப்பை\s*மூடு)", re.I), "win+ctrl+f4"),
    (re.compile(r"(task\s*view|all\s*windows\s*view|running\s*apps\s*view|open\s*task\s*view|பணிப்\s*பார்வை)", re.I), "win+tab"),
    # Properties & Navigation
    (re.compile(r"(\bproperties\b|file\s*properties|item\s*properties|propriétés|propiedades|பண்புகள்)", re.I), "alt+enter"),
    (re.compile(r"(parent\s*folder|up\s*one\s*folder|folder\s*mela\s*po|go\s*to\s*parent|மேல்\s*கோப்புறை)", re.I), "alt+up"),
    # Zoom
    (re.compile(r"(zoom\s*in|perusa\s*kaatu|zoom\s*pannu|agrandir\s*zoom|ampliar\s*zoom)", re.I), "ctrl+plus"),
    (re.compile(r"(zoom\s*out|chinnatha\s*kaatu|dézoomer|alejar\s*zoom)", re.I), "ctrl+minus"),
    (re.compile(r"(reset\s*zoom|normal\s*zoom|default\s*zoom|actual\s*size)", re.I), "ctrl+0"),
    # Audio & Media Controls
    (re.compile(r"(mute\s*sound|unmute\s*sound|mute\s*audio|sound\s*mute|சத்தத்தை\s*நிறுத்து)", re.I), "volume_mute"),
    (re.compile(r"(volume\s*up|sound\s*increase|sound\s*ethu|increase\s*volume|சத்தத்தை\s*அதிகரி)", re.I), "volume_up"),
    (re.compile(r"(volume\s*down|sound\s*decrease|sound\s*kammi\s*pannu|decrease\s*volume|சத்தத்தை\s*குறை)", re.I), "volume_down"),
    (re.compile(r"(pause\s*music|pause\s*video|play\s*music|play\s*pause|பாடலை\s*நிறுத்து)", re.I), "playpause"),
    (re.compile(r"(next\s*song|next\s*track|adutha\s*paattu|agla\s*gana|அடுத்த\s*பாடல்)", re.I), "nexttrack"),
    (re.compile(r"(previous\s*song|prev\s*track|munnadi\s*paattu|pichla\s*gana|முந்தைய\s*பாடல்)", re.I), "prevtrack"),
    # Screen Recording & Screenshots
    (re.compile(r"(take\s*screenshot|capture\s*screen|screenshot\s*edu|திரைப்பிடிப்பு\s*எடு|स्क्रीनशॉट\s*लो)", re.I), "win+shift+s"),
    (re.compile(r"(full\s*screenshot|save\s*screenshot|print\s*screen)", re.I), "win+prtscn"),
    (re.compile(r"(screen\s*record|record\s*screen|screen\s*recording\s*start|திரை\s*பதிவு)", re.I), "win+alt+r"),
    (re.compile(r"(game\s*bar|xbox\s*bar|gaming\s*overlay)", re.I), "win+g"),
    # GPU & Recovery
    (re.compile(r"(gpu\s*reset|graphics\s*driver\s*restart|restart\s*graphics|screen\s*freeze\s*fix|reset\s*gpu|display\s*driver\s*reset)", re.I), "win+ctrl+shift+b"),
    # Hardware & Tools
    (re.compile(r"(voice\s*dictation|speech\s*typing|voice\s*typing|kural\s*vazhi\s*ezhuthu|குரல்\s*தட்டச்சு)", re.I), "win+h"),
    (re.compile(r"(winx\s*menu|power\s*menu|power\s*user\s*menu|quick\s*link\s*menu)", re.I), "win+x"),
    (re.compile(r"(project\s*display|project\s*screen|extend\s*display|duplicate\s*display|second\s*screen)", re.I), "win+p"),
    (re.compile(r"(cast\s*screen|connect\s*display|wireless\s*display|connect\s*screen)", re.I), "win+k"),
    (re.compile(r"(toggle\s*hdr|hdr\s*toggle|turn\s*on\s*hdr|turn\s*off\s*hdr)", re.I), "win+alt+b"),
    (re.compile(r"(widgets\s*board|open\s*widgets|widgets\s*panel|weather\s*widget)", re.I), "win+w"),
    (re.compile(r"(notification\s*center|open\s*notifications|calendar\s*popup|அறிவிப்புகள்)", re.I), "win+n"),
    (re.compile(r"(clear\s*browsing\s*data|clear\s*history\s*dialog|clear\s*cache)", re.I), "ctrl+shift+del"),
    (re.compile(r"(search\s*tabs|tab\s*search|find\s*tab)", re.I), "ctrl+shift+a"),
    (re.compile(r"(context\s*menu|right\s*click\s*menu|options\s*menu)", re.I), "shift+f10"),
    (re.compile(r"(open\s*narrator|screen\s*reader|narrator\s*on)", re.I), "win+ctrl+enter"),
    # Video & Media Pro
    (re.compile(r"(increase\s*video\s*speed|video\s*speed\s*up|speed\s*ethu|speed\s*aaku)", re.I), "shift+."),
    (re.compile(r"(decrease\s*video\s*speed|video\s*slow\s*down|slow\s*pannu)", re.I), "shift+,"),
    (re.compile(r"(toggle\s*subtitles|subtitles\s*on|subtitles\s*off|captions\s*on|captions\s*off|துணைத்தலைப்பு)", re.I), "c"),
    (re.compile(r"(rewind\s*10\s*s|10\s*seconds\s*back|10\s*sec\s*rewind|pinnadi\s*po)", re.I), "j"),
    (re.compile(r"(forward\s*10\s*s|10\s*seconds\s*forward|10\s*sec\s*forward|munnadi\s*po)", re.I), "l"),
    (re.compile(r"(theater\s*mode|theatre\s*mode|cinema\s*mode)", re.I), "t"),
    (re.compile(r"(miniplayer|picture\s*in\s*picture|pip\s*mode)", re.I), "i"),
    (re.compile(r"(restart\s*video|start\s*from\s*beginning|video\s*mothala\s*irunthu|mothala\s*irunthu)", re.I), "0"),
    (re.compile(r"(youtube\s*play|youtube\s*pause|video\s*pause|video\s*play)", re.I), "k"),
    # Browser Pro
    (re.compile(r"(bookmarks\s*bar|show\s*bookmarks|hide\s*bookmarks|toggle\s*bookmarks)", re.I), "ctrl+shift+b"),
    (re.compile(r"(bookmark\s*all\s*tabs|save\s*all\s*tabs)", re.I), "ctrl+shift+d"),
    (re.compile(r"(developer\s*tools|open\s*devtools|inspect\s*element)", re.I), "f12"),
    (re.compile(r"(browser\s*menu|chrome\s*menu|edge\s*menu|3\s*dots\s*menu|three\s*dots\s*menu)", re.I), "alt+f"),
    (re.compile(r"(find\s*previous|previous\s*match|munnadi\s*thedu|munnadi\s*match)", re.I), "ctrl+shift+g"),
    (re.compile(r"(search\s*bar\s*ku\s*po|focus\s*search\s*bar|focus\s*search\s*box|slash\s*search)", re.I), "/"),
    # Document Formatting & Alignment
    (re.compile(r"(find\s*(and|_)?\s*replace|replace\s*text|replace\s*pannu)", re.I), "ctrl+h"),
    (re.compile(r"(center\s*align|align\s*center|naduvula\s*vai)", re.I), "ctrl+e"),
    (re.compile(r"(left\s*align|align\s*left)", re.I), "ctrl+l"),
    (re.compile(r"(right\s*align|align\s*right)", re.I), "ctrl+r"),
    (re.compile(r"(spell\s*check|check\s*spelling|grammar\s*check)", re.I), "f7"),
    (re.compile(r"(change\s*case|uppercase|lowercase|title\s*case|case\s*maathu|எழுத்து\s*வடிவம்)", re.I), "shift+f3"),
    (re.compile(r"(insert\s*hyperlink|insert\s*link|add\s*link|link\s*podu|இணைப்பை\s*சேர்)", re.I), "ctrl+k"),
    # Developer & VS Code
    (re.compile(r"(toggle\s*terminal|open\s*terminal|terminal\s*open|terminal\s*moodu)", re.I), "ctrl+`"),
    (re.compile(r"(command\s*palette|open\s*command\s*palette)", re.I), "ctrl+shift+p"),
    (re.compile(r"(open\s*extensions|vs\s*code\s*extensions|extensions\s*panel)", re.I), "ctrl+shift+x"),
    (re.compile(r"(split\s*terminal|split\s*pane)", re.I), "alt+shift+d"),
    (re.compile(r"(toggle\s*breakpoint|set\s*breakpoint|remove\s*breakpoint)", re.I), "f9"),
    (re.compile(r"(comment\s*code|comment\s*line|comment\s*pannu|uncomment)", re.I), "ctrl+/"),
    # Presentation & Slideshow
    (re.compile(r"(slideshow\s*from\s*current\s*slide|current\s*slide\s*slideshow)", re.I), "shift+f5"),
    (re.compile(r"(next\s*slide|adutha\s*slide|அடுத்த\s*ஸ்லைடு)", re.I), "n"),
    (re.compile(r"(previous\s*slide|prev\s*slide|munnadi\s*slide|முந்தைய\s*ஸ்லைடு)", re.I), "p"),
    # Meetings & Communication
    (re.compile(r"(zoom\s*mute|mute\s*audio\s*zoom|audio\s*toggle\s*zoom|zoom\s*audio)", re.I), "alt+a"),
    (re.compile(r"(teams\s*mute|mute\s*mic\s*teams|teams\s*mic|mic\s*mute)", re.I), "ctrl+shift+m"),
    (re.compile(r"(zoom\s*video|camera\s*off\s*zoom|video\s*toggle\s*zoom|zoom\s*camera)", re.I), "alt+v"),
    (re.compile(r"(zoom\s*share\s*screen|zoom\s*screen\s*share)", re.I), "alt+s"),
    (re.compile(r"(raise\s*hand|lower\s*hand|kaiya\s*thooku|கையை\s*உயர்த்து)", re.I), "alt+y"),
    (re.compile(r"(open\s*preferences|app\s*preferences|app\s*settings|application\s*settings)", re.I), "ctrl+,"),
    (re.compile(r"(archive\s*email|archive\s*mail|archive\s*pannu)", re.I), "e"),
    (re.compile(r"(reply\s*all|reply\s*all\s*mail|reply\s*all\s*email)", re.I), "a"),
    (re.compile(r"(reply\s*email|reply\s*mail|reply\s*pannu)", re.I), "r"),
    # Windows Tools & Layouts
    (re.compile(r"(on\s*screen\s*keyboard|screen\s*keyboard|virtual\s*keyboard)", re.I), "win+ctrl+o"),
    (re.compile(r"(details\s*view|list\s*view\s*kaami|file\s*details\s*view)", re.I), "ctrl+shift+6"),
    # Excel & Spreadsheets
    (re.compile(r"(auto\s*sum|autosum|total\s*podu|kootu\s*thogai|somme\s*automatique)", re.I), "alt+="),
    (re.compile(r"(select\s*row|select\s*entire\s*row|row\s*select\s*pannu|வரிசையைத்\s*தேர்ந்தெடு)", re.I), "shift+space"),
    (re.compile(r"(select\s*column|select\s*entire\s*column|column\s*select\s*pannu|நெடுவரிசையைத்\s*தேர்ந்தெடு)", re.I), "ctrl+space"),
    (re.compile(r"(insert\s*current\s*date|insert\s*date|today\s*date|innaiku\s*date|inraiya\s*thethi|இன்றைய\s*தேதி)", re.I), "ctrl+;"),
    (re.compile(r"(insert\s*current\s*time|insert\s*time|current\s*time|ippo\s*time|inraiya\s*neram|தற்போதைய\s*நேரம்)", re.I), "ctrl+shift+:"),
    (re.compile(r"(toggle\s*filter|autofilter|auto\s*filter|filter\s*podu|filter\s*pannu|வடிகட்டி)", re.I), "ctrl+shift+l"),
    (re.compile(r"(fill\s*down|keezha\s*fill\s*pannu|down\s*fill)", re.I), "ctrl+d"),
    (re.compile(r"(next\s*sheet|adutha\s*sheet|agla\s*sheet|அடுத்த\s*தாள்)", re.I), "ctrl+pagedown"),
    (re.compile(r"(previous\s*sheet|prev\s*sheet|munnadi\s*sheet|pichla\s*sheet|முந்தைய\s*தாள்)", re.I), "ctrl+pageup"),
    # Code Line Movement & Editing
    (re.compile(r"(move\s*line\s*up|line\s*mela\s*move\s*pannu|line\s*up)", re.I), "alt+up"),
    (re.compile(r"(move\s*line\s*down|line\s*keezha\s*move\s*pannu|line\s*down)", re.I), "alt+down"),
    (re.compile(r"(duplicate\s*line|line\s*copy\s*pannu|duplicate\s*pannu)", re.I), "shift+alt+down"),
    (re.compile(r"(word\s*wrap|toggle\s*wrap|wrap\s*text|toggle\s*word\s*wrap)", re.I), "alt+z"),
    (re.compile(r"(select\s*next\s*occurrence|next\s*match\s*select|adutha\s*match)", re.I), "ctrl+d"),
    (re.compile(r"(go\s*to\s*line|line\s*number\s*ku\s*po)", re.I), "ctrl+g"),
    # File Explorer
    (re.compile(r"(file\s*explorer|open\s*explorer|folder\s*open|files\s*open|explorer\s*thira|файлы|explorador\s*de\s*archivos|கோப்பு\s*உலாவி)", re.I), "win+e"),
    # Settings
    (re.compile(r"(open\s*settings|windows\s*settings|system\s*settings|settings\s*open|settings\s*thira|configuración|paramètres|அமைப்புகள்)", re.I), "win+i"),
    # Quick Settings / Toggles
    (re.compile(r"(quick\s*settings|action\s*center|quick\s*toggles|wifi\s*bluetooth\s*toggles|tray\s*settings)", re.I), "win+a"),
    # Run
    (re.compile(r"(open\s*run|run\s*dialog|run\s*window|run\s*box|ejecutar)", re.I), "win+r"),
    # Search
    (re.compile(r"(search\s*windows|search\s*computer|windows\s*search|desktop\s*search|rechercher|buscar)", re.I), "win+s"),
    # Task Manager
    (re.compile(r"(task\s*manager|open\s*taskmgr|taskmgr|gestionnaire\s*des\s*tâches|administrador\s*de\s*tareas)", re.I), "ctrl+shift+esc"),
    # Minimize / Desktop
    (re.compile(r"(minimize\s*all|show\s*desktop|desktop\s*po|minimize\s*windows|hide\s*windows|desktop\s*(kaatu|kaattu|kattu|காட்டு)|டெஸ்க்டாப்\s*காட்டு)", re.I), "win+d"),
    # Close Window / Application
    (re.compile(r"(close\s*window|window\s*close|window\s*moodu|window-ah\s*moodu|app\s*close|close\s*app|fermer\s*la\s*fenêtre|cerrar\s*ventana|விண்டோவை\s*மூடு)", re.I), "alt+f4"),
    # Lock
    (re.compile(r"(lock\s*computer|lock\s*laptop|lock\s*pc|screen\s*lock|lock\s*pannu|bloquear)", re.I), "win+l"),
    # Bookmark
    (re.compile(r"(bookmark\s*page|save\s*bookmark|bookmark\s*pannu|favoris|marcador)", re.I), "ctrl+d"),
    # Address Bar
    (re.compile(r"(address\s*bar|url\s*bar|go\s*to\s*address\s*bar|type\s*url|barra\s*de\s*direcciones)", re.I), "ctrl+l"),
    # Camera Shutter
    (re.compile(r"(take\s*photo|click\s*photo|capture\s*photo|snap\s*photo|camera\s*photo\s*edu|புகைப்படம்\s*எடு|फोटो\s*खींचो)", re.I), "space"),
]


def is_explicit_mouse_request(goal: str) -> bool:
    """
    Check if the user explicitly commanded to use the mouse.
    Returns True if user explicitly asked for mouse/cursor/pointer interaction in any language.
    """
    cleaned = goal.lower().strip()
    for pattern in EXPLICIT_MOUSE_PATTERNS:
        if re.search(pattern, cleaned, re.IGNORECASE):
            log.info("Explicit mouse request detected for goal: '%s'", goal)
            return True
    return False


def detect_fast_shortcut(goal: str) -> ComputerAction | None:
    """
    Tier 1 Fast Heuristic (0ms).
    Matches instant multi-lingual stems. Returns ComputerAction or None.
    """
    if is_explicit_mouse_request(goal):
        return None

    cleaned = goal.lower().strip()

    # Disallow compound tasks that require subsequent deep typing or multi-step workflow
    temp_cleaned = cleaned.replace("find and replace", "find_replace")
    if any(cw in f" {temp_cleaned} " for cw in COMPOUND_DELIMITERS):
        return None

    for pattern, shortcut_key in FAST_CACHE:
        if pattern.search(cleaned):
            if shortcut_key in CANONICAL_SHORTCUTS:
                act_type, desc = CANONICAL_SHORTCUTS[shortcut_key]
                log.info("Tier 1 Fast-Path matched '%s' -> %s (%s)", shortcut_key, act_type, desc)
                return ComputerAction(
                    action_type=act_type,
                    key=shortcut_key,
                    reasoning=f"Shortcut-First Acceleration: {desc}",
                )

    return None
