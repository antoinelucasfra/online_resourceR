# Message to highlight R version being used and that this file is loaded.
# Messages uses 'cli' for prettier messages if available.
if (nzchar(system.file(package = "cli"))) {
  cli::cli_alert_info(R.version.string)
  cli::cli_alert_warning(paste0("Config '", cli::col_green("~/.Rprofile"), "' was loaded!"))
  options(
    knitr.progress.fun = function(total, labels) {
      id <- cli::cli_progress_bar(
        total = total, .auto_close = FALSE
      )
      list(
        update = function(i) {
          cli::cli_progress_update(id = id)
        },
        done = function() {
          cli::cli_process_done(id)
        }
      )
    }
  )
} else {
  message(R.version.string)
  message("Config '~/.Rprofile' was loaded!")
}

# Tweak 'styler' formatter used by VSCode.
# See R package documentation for more details.
if (nzchar(system.file(package = "styler"))) {
  options(
    languageserver.formatting_style = function(options, ...) {
      transformers <- styler::tidyverse_style(indent_by = options$tabSize, ...)
      transformers$indention$update_indention_ref_fun_dec <- NULL
      transformers$indention$unindent_fun_dec <- NULL
      transformers$line_break$remove_line_breaks_in_fun_dec <- NULL
      transformers
    }
  )
}

if (interactive()) {
  # Display Git branch in R prompt if 'prompt' R package is installed.
  if (nzchar(system.file(package = "prompt"))) {
    prompt::set_prompt(prompt::prompt_git)
  }
}
