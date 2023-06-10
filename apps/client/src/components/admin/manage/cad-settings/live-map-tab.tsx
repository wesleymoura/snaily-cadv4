import * as Popover from "@radix-ui/react-popover";
import * as React from "react";
import { Alert, Button, Input, Loader, TabsContent, TextField } from "@snailycad/ui";
import { useAuth } from "context/AuthContext";
import { Form, Formik, FormikHelpers } from "formik";
import useFetch from "lib/useFetch";
import { useTranslations } from "use-intl";
import { SettingsFormField } from "components/form/SettingsFormField";
import { SettingsTabs } from "src/pages/admin/manage/cad-settings";
import { toastMessage } from "lib/toastMessage";
import type { PutCADMiscSettingsData } from "@snailycad/types/api";
import Link from "next/link";
import { BoxArrowUpRight, ChevronDown } from "react-bootstrap-icons";
import { Table, useTableState } from "components/shared/Table";

const TILE_NAMES = [
  "minimap_sea_0_0",
  "minimap_sea_0_1",
  "minimap_sea_1_0",
  "minimap_sea_1_1",
  "minimap_sea_2_0",
  "minimap_sea_2_1",
];

export function LiveMapTab() {
  const common = useTranslations("Common");
  const { state, execute } = useFetch();
  const { cad, setCad } = useAuth();
  const t = useTranslations("LiveMapTab");
  const tableState = useTableState();
  const [openPopover, setOpenPopover] = React.useState<`edit-${string}` | "add" | null>(null);
  const [liveMapURLs, setLiveMapURLs] = React.useState<
    NonNullable<PutCADMiscSettingsData["liveMapURLs"]>
  >(cad?.miscCadSettings?.liveMapURLs ?? []);

  async function onSubmit(
    values: typeof INITIAL_VALUES,
    helpers: FormikHelpers<typeof INITIAL_VALUES>,
  ) {
    if (!cad) return;

    if (values.tiles) {
      const fileNames = Array.from(values.tiles).map((file) => file.name.split(".")[0]);
      const missing = TILE_NAMES.filter((name) => !fileNames.includes(name));

      if (missing.length > 0) {
        helpers.setErrors({
          tiles: `Missing files: ${missing.join(", ")}`,
        });
      }

      const formData = new FormData();
      const tiles = Array.from(values.tiles);

      for (const tile of tiles) {
        const [name] = tile.name.split(".") as [string, string];
        formData.append("tiles", tile, name);
      }

      toastMessage({
        message:
          "Uploading and processing map tiles. This may take a few minutes. Do not close this page.",
        title: "Processing Tiles",
        icon: "info",
      });

      await execute<PutCADMiscSettingsData>({
        path: "/admin/manage/cad-settings/live-map/tiles",
        method: "PUT",
        data: formData,
        headers: { "content-type": "multipart/form-data" },
      });
    }

    const { json } = await execute<PutCADMiscSettingsData>({
      path: "/admin/manage/cad-settings/live-map",
      method: "PUT",
      data: { ...values, liveMapURLs },
    });

    if (json?.id) {
      setCad({ ...cad, miscCadSettings: { ...cad.miscCadSettings, ...json } });

      toastMessage({
        icon: "success",
        message: "Successfully updated live map settings.",
      });
    }
  }

  const INITIAL_VALUES = {
    liveMapURL: cad?.miscCadSettings?.liveMapURL ?? "",
    tiles: undefined as FileList | undefined,
  };

  return (
    <TabsContent aria-label={t("liveMapSettings")} value={SettingsTabs.LiveMap}>
      <h2 className="mt-2 text-2xl font-semibold">{t("liveMapSettings")}</h2>

      <p className="my-3 text-neutral-700 dark:text-gray-400 max-w-2xl">
        {t("liveMapSettingsInfo")}
      </p>

      <Formik onSubmit={onSubmit} initialValues={INITIAL_VALUES}>
        {({ setFieldValue, errors, values }) => (
          <Form className="mt-3 space-y-5">
            <SettingsFormField
              description={
                <span>
                  {t("liveMapUrlDescription")}{" "}
                  <Link
                    className="mt-1 underline inline-flex items-center gap-1 text-neutral-700 dark:text-gray-200"
                    target="_blank"
                    href="https://docs.snailycad.org/docs/fivem-integrations/live-map"
                  >
                    {common("learnMore")}
                    <BoxArrowUpRight className="inline-block" />
                  </Link>
                </span>
              }
              label={
                <div className="flex items-center justify-between">
                  {t("liveMapURLs")}

                  <ManageURLPopover
                    liveMapURLs={liveMapURLs}
                    setLiveMapURLs={setLiveMapURLs}
                    trigger={
                      <Button
                        onPress={() => setOpenPopover("add")}
                        size="xs"
                        className="text-base flex gap-2 items-center"
                      >
                        {t("addURL")}
                        <ChevronDown className="w-3 mt-0.5" />
                      </Button>
                    }
                    url={null}
                    isPopoverOpen={openPopover === "add"}
                    setIsPopoverOpen={(v) => setOpenPopover(v ? "add" : null)}
                  />
                </div>
              }
            >
              {liveMapURLs.length <= 0 ? (
                <>
                  <p className="text-neutral-500 dark:text-gray-400">{t("noLiveMapUrls")}</p>

                  {values.liveMapURL ? (
                    <Alert
                      className="mt-3"
                      type="success"
                      title={t("foundPreviousLiveMapURLTitle")}
                    >
                      <span className="font-medium">{t("foundPreviousLiveMapURLDescription")}</span>

                      <Button
                        className="mt-3 max-w-fit"
                        onPress={() => {
                          setFieldValue("liveMapURL", null);

                          setLiveMapURLs((prev) => [
                            ...prev,
                            { url: values.liveMapURL, name: "Default" } as any,
                          ]);
                        }}
                      >
                        {t("addURL")}
                      </Button>
                    </Alert>
                  ) : null}
                </>
              ) : (
                <Table
                  tableState={tableState}
                  data={liveMapURLs.map((url) => {
                    return {
                      id: `${url.url}-${url.id}`,
                      name: url.name,
                      url: url.url,
                      actions: (
                        <>
                          <ManageURLPopover
                            liveMapURLs={liveMapURLs}
                            setLiveMapURLs={setLiveMapURLs}
                            trigger={
                              <Button
                                onPress={() => setOpenPopover(`edit-${url.url}`)}
                                size="xs"
                                variant="success"
                                className="text-base flex gap-2 items-center mr-2"
                              >
                                {common("edit")}
                                <ChevronDown className="w-3 mt-0.5" />
                              </Button>
                            }
                            url={url}
                            isPopoverOpen={openPopover === `edit-${url.url}`}
                            setIsPopoverOpen={(v) => setOpenPopover(v ? `edit-${url.url}` : null)}
                          />

                          <Button
                            onPress={() => {
                              setLiveMapURLs((prev) => prev.filter((u) => u.url !== url.url));
                            }}
                            size="xs"
                            variant="danger"
                          >
                            {common("delete")}
                          </Button>
                        </>
                      ),
                    };
                  })}
                  columns={[
                    { header: common("name"), accessorKey: "name" },
                    { header: common("url"), accessorKey: "url" },
                    { header: common("actions"), accessorKey: "actions" },
                  ]}
                />
              )}
            </SettingsFormField>

            <SettingsFormField
              description={
                <span>
                  {t("mapTilesDescription")}{" "}
                  {TILE_NAMES.map((name, idx) => (
                    <React.Fragment key={idx}>
                      <code key={idx}>{name}</code>
                      {idx === TILE_NAMES.length - 1 ? "" : ", "}
                    </React.Fragment>
                  ))}
                  <Link
                    className="flex mt-3 underline items-center gap-1 text-neutral-700 dark:text-gray-200"
                    target="_blank"
                    href="https://docs.snailycad.org/docs/fivem-integrations/live-map/how-to-set-custom-map-files"
                  >
                    {common("learnMore")}
                    <BoxArrowUpRight className="inline-block" />
                  </Link>
                </span>
              }
              errorMessage={errors.tiles}
              label={t("mapTiles")}
            >
              <Input
                multiple
                type="file"
                name="tiles"
                onChange={(e) => setFieldValue("tiles", e.target.files ?? [])}
              />
            </SettingsFormField>

            <div className="flex">
              <Button className="flex items-center" type="submit" disabled={state === "loading"}>
                {state === "loading" ? <Loader className="mr-3 border-red-300" /> : null}
                {common("save")}
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </TabsContent>
  );
}

interface ManageURLPopoverProps {
  trigger: React.ReactNode;
  isPopoverOpen: boolean;
  setIsPopoverOpen: React.Dispatch<React.SetStateAction<boolean>>;
  url?: { url: string; id: string; name: string } | null;
  liveMapURLs: NonNullable<PutCADMiscSettingsData["liveMapURLs"]>;
  setLiveMapURLs: React.Dispatch<
    React.SetStateAction<NonNullable<PutCADMiscSettingsData["liveMapURLs"]>>
  >;
}

function ManageURLPopover(props: ManageURLPopoverProps) {
  const t = useTranslations("LiveMapTab");
  const common = useTranslations("Common");

  const [name, setName] = React.useState(props.url?.name ?? "");
  const [url, setUrl] = React.useState(props.url?.url ?? "");

  React.useEffect(() => {
    setName(props.url?.name ?? "");
    setUrl(props.url?.url ?? "");
  }, [props.url]);

  function handleSubmit() {
    const existsInUrl = props.liveMapURLs.some((url) => url.url === props.url?.url);

    if (!existsInUrl) {
      props.setLiveMapURLs((prev) => [...prev, { name, url } as any]);
    } else {
      const newLiveMapURls = props.liveMapURLs.map((u) => {
        if (u.url === props.url?.url) {
          return { id: u.id, name, url } as any;
        }

        return u;
      });

      props.setLiveMapURLs(newLiveMapURls);
    }

    props.setIsPopoverOpen(false);
  }

  return (
    <Popover.Root open={props.isPopoverOpen} onOpenChange={props.setIsPopoverOpen}>
      <Popover.Trigger asChild>
        <span>{props.trigger}</span>
      </Popover.Trigger>

      <Popover.Content className="z-[999] p-4 bg-gray-200 rounded-md shadow-md dropdown-fade w-96 dark:bg-primary dark:border dark:border-secondary text-base font-normal">
        <h3 className="text-xl font-semibold mb-3">{props.url ? t("editURL") : t("addURL")}</h3>

        <div>
          <TextField label={common("name")} value={name} onChange={(value) => setName(value)} />
          <TextField
            placeholder="http://my-host:my-port"
            type="url"
            label={common("url")}
            value={url}
            onChange={(value) => setUrl(value)}
          />

          <Button type="button" onPress={handleSubmit} size="xs">
            {props.url ? common("save") : t("addURL")}
          </Button>
        </div>

        <Popover.Arrow className="fill-primary" />
      </Popover.Content>
    </Popover.Root>
  );
}
