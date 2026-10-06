"""
Unit tests for Universal Multilingual Shortcut-First Acceleration & Intelligent Mouse Fallback.
"""

from unittest.mock import AsyncMock, MagicMock
import pytest
from seyal_ai.agents.computer_use.shortcuts import (
    detect_fast_shortcut,
    is_explicit_mouse_request,
    resolve_universal_shortcut,
)
from seyal_ai.agents.computer_use.protocol import ActionType
from seyal_ai.llm.providers.base import LLMResponse


def test_explicit_mouse_detection_multilingual():
    # English
    assert is_explicit_mouse_request("use the mouse to click the button") is True
    assert is_explicit_mouse_request("move the mouse cursor to top right") is True
    assert is_explicit_mouse_request("click with mouse on the screen") is True

    # Tanglish & Tamil
    assert is_explicit_mouse_request("mouse use panni andha button ah click pannu") is True
    assert is_explicit_mouse_request("mouse vechu click pannu") is True
    assert is_explicit_mouse_request("cursor ah move pannu") is True
    assert is_explicit_mouse_request("மவுஸ் வச்சு கிளிக் பண்ணு") is True
    assert is_explicit_mouse_request("சுட்டி கொண்டு தேர்ந்தெடு") is True

    # Hindi & Spanish
    assert is_explicit_mouse_request("माउस से क्लिक करो") is True
    assert is_explicit_mouse_request("haz clic con el ratón") is True

    # Non-mouse commands
    assert is_explicit_mouse_request("open file explorer") is False
    assert is_explicit_mouse_request("open new tab") is False
    assert is_explicit_mouse_request("save file") is False
    assert is_explicit_mouse_request("camera photo edu") is False


def test_tier1_fast_cache_multilingual():
    # Select all: English, Tanglish, Pure Tamil, French, Spanish
    a1 = detect_fast_shortcut("select all")
    assert a1 is not None and a1.key == "ctrl+a"

    a2 = detect_fast_shortcut("ellathaiyum select pannu")
    assert a2 is not None and a2.key == "ctrl+a"

    a3 = detect_fast_shortcut("அனைத்தையும் தேர்ந்தெடு")
    assert a3 is not None and a3.key == "ctrl+a"

    a4 = detect_fast_shortcut("tout sélectionner")
    assert a4 is not None and a4.key == "ctrl+a"

    # Browser new tab: English, Tamil, Hindi, Spanish
    t1 = detect_fast_shortcut("chrome la new tab open pannu")
    assert t1 is not None and t1.key == "ctrl+t"

    t2 = detect_fast_shortcut("புதிய தத்தல் திற")
    assert t2 is not None and t2.key == "ctrl+t"

    t3 = detect_fast_shortcut("naya tab kholo")
    assert t3 is not None and t3.key == "ctrl+t"

    # Save: English, Tamil, Spanish
    s1 = detect_fast_shortcut("save pannu")
    assert s1 is not None and s1.key == "ctrl+s"

    s2 = detect_fast_shortcut("கோப்பை சேமி செய்")
    assert s2 is not None and s2.key == "ctrl+s"

    # Explorer: win+e
    e1 = detect_fast_shortcut("file explorer open pannu")
    assert e1 is not None and e1.key == "win+e"

    # New Folder: English, Tanglish, French, Spanish, Tamil
    nf1 = detect_fast_shortcut("create a new folder")
    assert nf1 is not None and nf1.key == "ctrl+shift+n"

    nf2 = detect_fast_shortcut("puthu folder create pannu")
    assert nf2 is not None and nf2.key == "ctrl+shift+n"

    nf3 = detect_fast_shortcut("புதிய கோப்புறை உருவாக்கு")
    assert nf3 is not None and nf3.key == "ctrl+shift+n"

    # Rename: English, Tanglish, Tamil
    rn1 = detect_fast_shortcut("rename this file")
    assert rn1 is not None and rn1.key == "f2"

    rn2 = detect_fast_shortcut("pera maathu")
    assert rn2 is not None and rn2.key == "f2"

    rn3 = detect_fast_shortcut("பெயர் மாற்று")
    assert rn3 is not None and rn3.key == "f2"

    # Window Snapping & Maximize / Minimize
    mx1 = detect_fast_shortcut("maximize window")
    assert mx1 is not None and mx1.key == "win+up"

    mx2 = detect_fast_shortcut("perusaaku")
    assert mx2 is not None and mx2.key == "win+up"

    mn1 = detect_fast_shortcut("minimize window")
    assert mn1 is not None and mn1.key == "win+down"

    sl1 = detect_fast_shortcut("snap left")
    assert sl1 is not None and sl1.key == "win+left"

    sr1 = detect_fast_shortcut("snap right")
    assert sr1 is not None and sr1.key == "win+right"

    # Virtual Desktops
    vd1 = detect_fast_shortcut("new virtual desktop")
    assert vd1 is not None and vd1.key == "win+ctrl+d"

    vd2 = detect_fast_shortcut("next desktop ku po")
    assert vd2 is not None and vd2.key == "win+ctrl+right"

    # GPU Driver Reset
    gpu1 = detect_fast_shortcut("restart graphics driver")
    assert gpu1 is not None and gpu1.key == "win+ctrl+shift+b"

    gpu2 = detect_fast_shortcut("gpu reset pannu")
    assert gpu2 is not None and gpu2.key == "win+ctrl+shift+b"

    # Voice Dictation
    vc1 = detect_fast_shortcut("voice typing on pannu")
    assert vc1 is not None and vc1.key == "win+h"

    # Audio & Media Controls
    m1 = detect_fast_shortcut("mute sound")
    assert m1 is not None and m1.key == "volume_mute"

    v1 = detect_fast_shortcut("volume up pannu")
    assert v1 is not None and v1.key == "volume_up"

    v2 = detect_fast_shortcut("sound kammi pannu")
    assert v2 is not None and v2.key == "volume_down"

    p1 = detect_fast_shortcut("pause music")
    assert p1 is not None and p1.key == "playpause"

    ns1 = detect_fast_shortcut("next song ku po")
    assert ns1 is not None and ns1.key == "nexttrack"

    # Screen Recording & Screenshot
    sr1 = detect_fast_shortcut("screen record pannu")
    assert sr1 is not None and sr1.key == "win+alt+r"

    sc1 = detect_fast_shortcut("screenshot edu")
    assert sc1 is not None and sc1.key == "win+shift+s"

    # Document & Print
    pr1 = detect_fast_shortcut("save as pdf")
    assert pr1 is not None and pr1.key == "ctrl+p"

    bld1 = detect_fast_shortcut("bold pannu")
    assert bld1 is not None and bld1.key == "ctrl+b"

    # Deletion
    del1 = detect_fast_shortcut("shift delete pannu")
    assert del1 is not None and del1.key == "shift+delete"

    del2 = detect_fast_shortcut("delete word")
    assert del2 is not None and del2.key == "ctrl+backspace"

    # Start Menu & Tabs
    st1 = detect_fast_shortcut("open start menu")
    assert st1 is not None and st1.key == "win"

    tb1 = detect_fast_shortcut("reopen closed tab")
    assert tb1 is not None and tb1.key == "ctrl+shift+t"

    # Video Pro
    vsp1 = detect_fast_shortcut("video speed up pannu")
    assert vsp1 is not None and vsp1.key == "shift+."

    sub1 = detect_fast_shortcut("subtitles on pannu")
    assert sub1 is not None and sub1.key == "c"

    rw1 = detect_fast_shortcut("10 seconds back po")
    assert rw1 is not None and rw1.key == "j"

    # Browser Pro & Bookmarks
    bm1 = detect_fast_shortcut("bookmarks bar kaami")
    assert bm1 is not None and bm1.key == "ctrl+shift+b"

    bm2 = detect_fast_shortcut("bookmark all tabs")
    assert bm2 is not None and bm2.key == "ctrl+shift+d"

    dt1 = detect_fast_shortcut("inspect element")
    assert dt1 is not None and dt1.key == "f12"

    # Document & Text Alignment
    fr1 = detect_fast_shortcut("find and replace pannu")
    assert fr1 is not None and fr1.key == "ctrl+h"

    al1 = detect_fast_shortcut("center align pannu")
    assert al1 is not None and al1.key == "ctrl+e"

    sp1 = detect_fast_shortcut("spell check pannu")
    assert sp1 is not None and sp1.key == "f7"

    # Developer & VS Code Tools
    tm1 = detect_fast_shortcut("toggle terminal")
    assert tm1 is not None and tm1.key == "ctrl+`"

    cp1 = detect_fast_shortcut("open command palette")
    assert cp1 is not None and cp1.key == "ctrl+shift+p"

    # Windows Tools & Layouts
    osk1 = detect_fast_shortcut("on screen keyboard open pannu")
    assert osk1 is not None and osk1.key == "win+ctrl+o"

    dv1 = detect_fast_shortcut("details view vai")
    assert dv1 is not None and dv1.key == "ctrl+shift+6"

    # Tab Movement & Navigation
    tb_mv1 = detect_fast_shortcut("move tab left")
    assert tb_mv1 is not None and tb_mv1.key == "ctrl+shift+pageup"

    tb_mv2 = detect_fast_shortcut("move tab right")
    assert tb_mv2 is not None and tb_mv2.key == "ctrl+shift+pagedown"

    tb_f1 = detect_fast_shortcut("next field ku po")
    assert tb_f1 is not None and tb_f1.key == "tab"

    tb_f2 = detect_fast_shortcut("shift tab adi")
    assert tb_f2 is not None and tb_f2.key == "shift+tab"

    # Excel & Spreadsheets
    xl1 = detect_fast_shortcut("autosum pannu")
    assert xl1 is not None and xl1.key == "alt+="

    xl2 = detect_fast_shortcut("select row")
    assert xl2 is not None and xl2.key == "shift+space"

    xl3 = detect_fast_shortcut("select column")
    assert xl3 is not None and xl3.key == "ctrl+space"

    # Code Line Movement & Editing
    ln1 = detect_fast_shortcut("line mela move pannu")
    assert ln1 is not None and ln1.key == "alt+up"

    ln2 = detect_fast_shortcut("line keezha move pannu")
    assert ln2 is not None and ln2.key == "alt+down"

    ln3 = detect_fast_shortcut("duplicate line")
    assert ln3 is not None and ln3.key == "shift+alt+down"

    ln4 = detect_fast_shortcut("go to line 45")
    assert ln4 is not None and ln4.key == "ctrl+g"

    ln5 = detect_fast_shortcut("delete line")
    assert ln5 is not None and ln5.key == "ctrl+shift+k"

    ln6 = detect_fast_shortcut("toggle word wrap")
    assert ln6 is not None and ln6.key == "alt+z"

    # Excel Pro additions
    xl4 = detect_fast_shortcut("innaiku date podu")
    assert xl4 is not None and xl4.key == "ctrl+;"

    xl5 = detect_fast_shortcut("insert current time")
    assert xl5 is not None and xl5.key == "ctrl+shift+:"

    xl6 = detect_fast_shortcut("filter podu")
    assert xl6 is not None and xl6.key == "ctrl+shift+l"

    xl7 = detect_fast_shortcut("fill down")
    assert xl7 is not None and xl7.key == "ctrl+d"

    xl8 = detect_fast_shortcut("adutha sheet ku po")
    assert xl8 is not None and xl8.key == "ctrl+pagedown"

    xl9 = detect_fast_shortcut("munnadi sheet")
    assert xl9 is not None and xl9.key == "ctrl+pageup"

    # Word & Writing additions
    wd1 = detect_fast_shortcut("case maathu")
    assert wd1 is not None and wd1.key == "shift+f3"

    wd2 = detect_fast_shortcut("insert hyperlink")
    assert wd2 is not None and wd2.key == "ctrl+k"

    # Browser & YouTube Pro Batch
    br1 = detect_fast_shortcut("hard reload")
    assert br1 is not None and br1.key == "ctrl+shift+r"

    br2 = detect_fast_shortcut("find previous")
    assert br2 is not None and br2.key == "ctrl+shift+g"

    br3 = detect_fast_shortcut("browser menu")
    assert br3 is not None and br3.key == "alt+f"

    br4 = detect_fast_shortcut("view page source")
    assert br4 is not None and br4.key == "ctrl+u"

    yt1 = detect_fast_shortcut("youtube pause")
    assert yt1 is not None and yt1.key == "k"

    yt2 = detect_fast_shortcut("theater mode")
    assert yt2 is not None and yt2.key == "t"

    yt3 = detect_fast_shortcut("miniplayer")
    assert yt3 is not None and yt3.key == "i"

    yt4 = detect_fast_shortcut("restart video")
    assert yt4 is not None and yt4.key == "0"

    yt5 = detect_fast_shortcut("slash search")
    assert yt5 is not None and yt5.key == "/"

    # Office, Slideshow & Debugger Batch
    of1 = detect_fast_shortcut("save as")
    assert of1 is not None and of1.key == "ctrl+shift+s"

    of2 = detect_fast_shortcut("open file")
    assert of2 is not None and of2.key == "ctrl+o"

    of3 = detect_fast_shortcut("increase font size")
    assert of3 is not None and of3.key == "ctrl+shift+>"

    of4 = detect_fast_shortcut("decrease font size")
    assert of4 is not None and of4.key == "ctrl+shift+<"

    of5 = detect_fast_shortcut("double line spacing")
    assert of5 is not None and of5.key == "ctrl+2"

    of6 = detect_fast_shortcut("1.5 line spacing")
    assert of6 is not None and of6.key == "ctrl+5"

    ss1 = detect_fast_shortcut("slideshow from current slide")
    assert ss1 is not None and ss1.key == "shift+f5"

    ss2 = detect_fast_shortcut("next slide")
    assert ss2 is not None and ss2.key == "n"

    ss3 = detect_fast_shortcut("previous slide")
    assert ss3 is not None and ss3.key == "p"

    vs1 = detect_fast_shortcut("open extensions")
    assert vs1 is not None and vs1.key == "ctrl+shift+x"

    vs2 = detect_fast_shortcut("toggle breakpoint")
    assert vs2 is not None and vs2.key == "f9"

    vs3 = detect_fast_shortcut("split terminal")
    assert vs3 is not None and vs3.key == "alt+shift+d"

    # Meetings & Webmail Batch
    mt1 = detect_fast_shortcut("zoom mute")
    assert mt1 is not None and mt1.key == "alt+a"

    mt2 = detect_fast_shortcut("teams mute")
    assert mt2 is not None and mt2.key == "ctrl+shift+m"

    mt3 = detect_fast_shortcut("zoom video")
    assert mt3 is not None and mt3.key == "alt+v"

    mt4 = detect_fast_shortcut("zoom share screen")
    assert mt4 is not None and mt4.key == "alt+s"

    mt5 = detect_fast_shortcut("raise hand")
    assert mt5 is not None and mt5.key == "alt+y"

    mt6 = detect_fast_shortcut("open preferences")
    assert mt6 is not None and mt6.key == "ctrl+,"

    wm1 = detect_fast_shortcut("archive email")
    assert wm1 is not None and wm1.key == "e"

    wm2 = detect_fast_shortcut("reply all email")
    assert wm2 is not None and wm2.key == "a"

    wm3 = detect_fast_shortcut("reply email")
    assert wm3 is not None and wm3.key == "r"


@pytest.mark.asyncio
async def test_tier2_universal_semantic_resolution():
    """Verify that rare dialects, obscure synonyms or arbitrary languages resolve via LLM."""
    mock_router = MagicMock()
    mock_router.initialize = AsyncMock()
    mock_router.generate = AsyncMock(
        return_value=LLMResponse(
            content='{"shortcut": "ctrl+a", "mouse_override": false, "description": "Select All Content"}'
        )
    )

    # Any arbitrary language phrasing (e.g. Telugu / obscure slang)
    action = await resolve_universal_shortcut("mottam text ni highlight cheyyi", router=mock_router)
    assert action is not None
    assert action.key == "ctrl+a"
    assert action.action_type == ActionType.HOTKEY


@pytest.mark.asyncio
async def test_shortcut_bypassed_when_mouse_explicitly_demanded():
    # If user says "mouse vechu new tab click pannu", shortcut MUST yield to mouse
    action = await resolve_universal_shortcut("mouse vechu new tab click pannu")
    assert action is None  # Handed over to mouse coordinate engine!


@pytest.mark.asyncio
async def test_shortcut_bypassed_on_deep_compound_tasks():
    # Compound tasks requiring chained workflows bypass single shortcut fast-path
    action = await resolve_universal_shortcut("open file explorer and click on downloads folder")
    assert action is None
